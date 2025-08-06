// app/api/process-bank-statement/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink } from 'fs/promises'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

interface Deposit {
  date: string
  description: string
  amount: number
}

/**
 * Extract office name from PDF filename
 * @param filename - The uploaded PDF filename
 * @returns The office name or null if not found
 */
function extractOfficeFromFilename(filename: string): string | null {
  // Remove file extension and convert to uppercase for easier matching
  const nameWithoutExt = filename.replace(/\.pdf$/i, '').toUpperCase()
  
  // Define office mappings - order matters for longer names first
  const officeNames = [
    'JERSEY CITY',
    'HACKENSACK', 
    'LIVINGSTON',
    'KEARNY',
    'UNION'
  ]
  
  // Find the first office name that appears in the filename
  for (const office of officeNames) {
    if (nameWithoutExt.includes(office)) {
      // Return in proper case
      return office.toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    }
  }
  
  return null
}

async function processPDFWithPython(buffer: Buffer, filename: string): Promise<any> {
  // Create a temporary file with a more unique name
  const tempDir = '/tmp'
  const tempFileName = `statement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.pdf`
  const tempFilePath = path.join(tempDir, tempFileName)
  
  try {
    // Write buffer to temporary file
    await writeFile(tempFilePath, buffer)
    
    // Get the path to the Python script
    const scriptPath = path.join(process.cwd(), 'scripts', 'parse_pdf.py')
    
    // Execute Python script with filename parameter
    const { stdout, stderr } = await execAsync(`python3 ${scriptPath} ${tempFilePath} "${filename}"`)
    
    if (stderr) {
      console.error('Python script error:', stderr)
    }
    
    // Parse the JSON output
    const result = JSON.parse(stdout)
    
    return result
    
  } catch (error) {
    throw error
  } finally {
    // Always try to clean up, but don't fail if file doesn't exist
    try {
      await unlink(tempFilePath)
    } catch (cleanupError) {
      // Ignore cleanup errors - file might already be deleted
      console.warn('Could not cleanup temp file (this is usually ok):', cleanupError.message)
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('pdf') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }
    
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      )
    }
    
    // Extract office from filename
    const officeFromFilename = extractOfficeFromFilename(file.name)
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Process PDF with Python script
    const result = await processPDFWithPython(buffer, file.name)
    
    // Check if Python script returned an error
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }
    
    // Override the office with the one extracted from filename
    // If filename extraction failed, fall back to the Python script result
    result.office = officeFromFilename || result.office || 'Unknown'
    
    // Add filename info to the response for debugging
    result.filename = file.name
    result.officeSource = officeFromFilename ? 'filename' : 'pdf_content'
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Error processing PDF:', error)
    return NextResponse.json(
      { error: `Failed to process PDF file: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}