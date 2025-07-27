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

async function processPDFWithPython(buffer: Buffer): Promise<any> {
  // Create a temporary file with a more unique name
  const tempDir = '/tmp'
  const tempFileName = `statement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.pdf`
  const tempFilePath = path.join(tempDir, tempFileName)
  
  try {
    // Write buffer to temporary file
    await writeFile(tempFilePath, buffer)
    
    // Get the path to the Python script
    const scriptPath = path.join(process.cwd(), 'scripts', 'parse_pdf.py')
    
    // Execute Python script
    const { stdout, stderr } = await execAsync(`python3 ${scriptPath} ${tempFilePath}`)
    
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
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Process PDF with Python script
    const result = await processPDFWithPython(buffer)
    
    // Check if Python script returned an error
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Error processing PDF:', error)
    return NextResponse.json(
      { error: `Failed to process PDF file: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}