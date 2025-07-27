// app/api/send-to-sheets/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { GoogleAuth } from 'google-auth-library'

interface Deposit {
  date: string
  description: string
  amount: number
}

interface RequestBody {
  deposits: Deposit[]
  offices?: string[]  // Array of offices for multi-file upload
  office?: string     // Single office for backward compatibility
  summary: {
    totalDeposits: number
    totalAmount: number
  }
}

class GoogleSheetsService {
  private auth: GoogleAuth
  private sheets: any
  private spreadsheetId: string

  constructor() {
    this.spreadsheetId = process.env.SPREADSHEET_ID!
    
    // Initialize Google Auth
    this.auth = new GoogleAuth({
      keyFile: process.env.GOOGLE_CREDENTIALS_FILE,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
    
    this.sheets = google.sheets({ version: 'v4', auth: this.auth })
  }

  async findNextEmptyRow(): Promise<number> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'A:A',
      })

      const values = response.data.values || []
      
      // Start from row 3 (after headers), find first empty row
      let nextRow = 3
      for (let i = 2; i < values.length; i++) { // Skip first 2 rows
        if (!values[i] || !values[i][0]) { // Empty row found
          nextRow = i + 1
          break
        }
        nextRow = i + 2
      }

      return nextRow
    } catch (error) {
      console.error('Error finding next empty row:', error)
      return 3 // Default to row 3
    }
  }

  async addDateHeader(row: number): Promise<void> {
    const today = new Date()
    const dateHeader = `Date ${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear().toString().slice(-2)}`
    
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `A${row}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[dateHeader]]
      }
    })
  }

  async addDepositsToSheet(deposits: Deposit[], allOffices?: string): Promise<void> {
    if (deposits.length === 0) {
      throw new Error('No deposits to add')
    }

    console.log(`Offices detected: ${allOffices}`) // Debug log
    console.log(`Number of deposits: ${deposits.length}`) // Debug log

    // Group deposits by date
    const depositsByDate = this.groupDepositsByDate(deposits)
    console.log(`Grouped into ${depositsByDate.size} date groups`) // Debug log
    
    // Find next empty row
    let currentRow = await this.findNextEmptyRow()
    
    // Process each date group
    for (const [date, dateDeposits] of depositsByDate) {
      console.log(`Processing date: ${date} with ${dateDeposits.length} deposits`) // Debug log
      
      // Add date header for this specific date
      const dateHeader = `Date ${this.formatDate(date)}`
      
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `A${currentRow}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[dateHeader]]
        }
      })
      currentRow++
      
      // Add column headers
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `A${currentRow}:C${currentRow}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [['Amount', 'Insurance Company', 'Office']]
        }
      })
      currentRow++
      
      // Add deposits for this date
      for (const deposit of dateDeposits) {
        // Each deposit should have its own office, or use the first detected office
        const depositOffice = (deposit as any).office || allOffices?.split(', ')[0] || 'Unknown'
        console.log(`Adding deposit: ${deposit.amount} - ${deposit.description} - Office: ${depositOffice}`) // Debug log
        
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `A${currentRow}:C${currentRow}`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [[deposit.amount, deposit.description, depositOffice]]
          }
        })
        
        // Add office dropdown to column C
        await this.addOfficeDropdownToRow(currentRow, 3)
        
        currentRow++
      }
      
      // Add empty row between date groups for readability
      currentRow++
    }
    
    console.log(`Added ${deposits.length} deposits grouped by date`)
  }

  private groupDepositsByDate(deposits: Deposit[]): Map<string, Deposit[]> {
    const grouped = new Map<string, Deposit[]>()
    
    for (const deposit of deposits) {
      const date = deposit.date
      if (!grouped.has(date)) {
        grouped.set(date, [])
      }
      grouped.get(date)!.push(deposit)
    }
    
    // Sort by date
    return new Map([...grouped.entries()].sort())
  }

  private formatDate(dateStr: string): string {
    // Convert "Jun 30" to "6/30/25" format
    try {
      const currentYear = new Date().getFullYear()
      const [month, day] = dateStr.split(' ')
      
      const monthMap: { [key: string]: number } = {
        'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
        'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
      }
      
      const monthNum = monthMap[month]
      const yearShort = currentYear.toString().slice(-2)
      
      return `${monthNum}/${parseInt(day)}/${yearShort}`
    } catch (error) {
      // Fallback to original format if parsing fails
      return dateStr
    }
  }

  async addOfficeDropdownToRow(row: number, column: number = 3): Promise<void> {
    const officeOptions = ['Union', 'Kearny', 'Livingston', 'Hackensack', 'Livingston/Kearny', 'Jersey City']
    
    try {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [{
            setDataValidation: {
              range: {
                sheetId: 0,
                startRowIndex: row - 1, // Convert to 0-based
                endRowIndex: row,
                startColumnIndex: column - 1, // Column C (Office) - 0-based  
                endColumnIndex: column
              },
              rule: {
                condition: {
                  type: 'ONE_OF_LIST',
                  values: officeOptions.map(office => ({ userEnteredValue: office }))
                },
                showCustomUi: true, // Enables chip-style dropdown
                strict: false
              }
            }
          }]
        }
      })
    } catch (error) {
      console.error(`Failed to add dropdown to row ${row}:`, error)
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json()
    
    if (!body.deposits || body.deposits.length === 0) {
      return NextResponse.json(
        { error: 'No deposits provided' },
        { status: 400 }
      )
    }

    // Validate environment variables
    if (!process.env.SPREADSHEET_ID) {
      return NextResponse.json(
        { error: 'Google Sheets configuration missing' },
        { status: 500 }
      )
    }

    const sheetsService = new GoogleSheetsService()
    
    // Handle both single office and multiple offices
    const offices = body.offices || (body.office ? [body.office] : [])
    const officeNames = offices.length > 0 ? offices.join(', ') : undefined
    
    await sheetsService.addDepositsToSheet(body.deposits, officeNames)

    return NextResponse.json({
      success: true,
      message: `Successfully added ${body.deposits.length} deposits to Google Sheets`,
      depositsAdded: body.deposits.length
    })

  } catch (error) {
    console.error('Error sending to Google Sheets:', error)
    return NextResponse.json(
      { error: `Failed to send to Google Sheets: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}