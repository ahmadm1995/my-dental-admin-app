"use client"

import * as React from "react"
import { useState, useCallback } from "react"
import { IconFileUpload, IconDownload, IconX, IconCheck, IconArrowUp, IconArrowDown } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Deposit {
  date: string
  description: string
  amount: number
}

interface UploadResult {
  deposits: Deposit[]
  offices?: string[]  // Array of offices for multi-file upload
  office?: string     // Single office for backward compatibility
  summary: {
    totalDeposits: number
    totalAmount: number
    breakdown: {
      regularDeposits: number
      metlifePayments: number
      synchronyDeposits: number
      fepDental: number
    }
  }
  fileResults?: Array<{
    fileName: string
    office: string
    deposits: Deposit[]
    summary: any
  }>
}

export function BankStatementUpload() {
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSendingToSheets, setIsSendingToSheets] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<'date' | 'description' | 'amount'>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    const pdfFiles = droppedFiles.filter(file => file.type === 'application/pdf')
    
    if (pdfFiles.length > 0) {
      setFiles(prev => [...prev, ...pdfFiles])
      setError(null)
    } else {
      setError('Please upload PDF files only')
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf')
    
    if (pdfFiles.length > 0) {
      setFiles(prev => [...prev, ...pdfFiles])
      setError(null)
    } else {
      setError('Please select PDF files only')
    }
  }

  const processFiles = async () => {
    if (files.length === 0) return

    setIsProcessing(true)
    setError(null)

    try {
      // Process all files in parallel
      const allResults = await Promise.all(
        files.map(async (file) => {
          const formData = new FormData()
          formData.append('pdf', file)

          const response = await fetch('/api/process-bank-statement', {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            throw new Error(`Failed to process ${file.name}`)
          }

          const data = await response.json()
          return {
            fileName: file.name,
            office: data.office,
            deposits: data.deposits,
            summary: data.summary
          }
        })
      )

      // Merge all deposits by date and attach office info to each deposit
      const allDeposits = allResults.flatMap(result => 
        result.deposits.map(deposit => ({
          ...deposit,
          office: result.office // Attach office to each deposit
        }))
      )
      const allOffices = allResults.map(result => result.office).filter(Boolean)
      
      // Calculate combined summary
      const totalAmount = allDeposits.reduce((sum, deposit) => sum + deposit.amount, 0)
      const breakdown = {
        regularDeposits: allDeposits.filter(d => d.description === "DEPOSIT").length,
        metlifePayments: allDeposits.filter(d => d.description.includes("METLIFE DENTAL")).length,
        synchronyDeposits: allDeposits.filter(d => d.description.includes("SYNCHRONY BANK")).length,
        fepDental: allDeposits.filter(d => d.description.includes("FEP DENTAL")).length
      }

      const consolidatedResult = {
        deposits: allDeposits,
        offices: allOffices, // Array of all detected offices
        summary: {
          totalDeposits: allDeposits.length,
          totalAmount: Math.round(totalAmount * 100) / 100,
          breakdown
        },
        fileResults: allResults // Keep individual file results for reference
      }

      console.log('Consolidated result:', consolidatedResult)
      setResult(consolidatedResult)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred processing files')
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadCSV = () => {
    if (!result) return

    const csvContent = [
      ['Date', 'Description', 'Amount'],
      ...result.deposits.map(deposit => [
        deposit.date,
        deposit.description,
        deposit.amount.toString()
      ])
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `filtered-deposits-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const sendToGoogleSheets = async () => {
    if (!result) return

    setIsSendingToSheets(true)
    setError(null)

    try {
      const response = await fetch('/api/send-to-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deposits: result.deposits,
          offices: result.offices || [result.office].filter(Boolean), // Send offices array
          summary: result.summary
        }),
      })

      console.log('Sending to sheets - Offices:', result.offices || [result.office]) // Debug log

      if (!response.ok) {
        throw new Error('Failed to send to Google Sheets')
      }

      const data = await response.json()
      
      // Show success message
      alert(`Successfully sent ${result.deposits.length} deposits to Google Sheets!`)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send to Google Sheets')
    } finally {
      setIsSendingToSheets(false)
    }
  }

  const sortDeposits = (deposits: Deposit[]) => {
    return [...deposits].sort((a, b) => {
      let aValue: any
      let bValue: any
      
      switch (sortField) {
        case 'date':
          // Convert "Jun 30" to sortable format
          aValue = new Date(a.date + ', 2025').getTime()
          bValue = new Date(b.date + ', 2025').getTime()
          break
        case 'description':
          aValue = a.description.toLowerCase()
          bValue = b.description.toLowerCase()
          break
        case 'amount':
          aValue = a.amount
          bValue = b.amount
          break
        default:
          return 0
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }

  const handleSort = (field: 'date') => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // New field, default to ascending
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: 'date' | 'description' | 'amount') => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? 
      <IconArrowUp className="h-4 w-4 ml-1" /> : 
      <IconArrowDown className="h-4 w-4 ml-1" />
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const resetUpload = () => {
    setFiles([])
    setResult(null)
    setError(null)
    setSortField('date')
    setSortDirection('asc')
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bank Statement Upload</h1>
          <p className="text-muted-foreground">
            Upload Provident Bank statements to extract filtered deposit data
          </p>
        </div>
      </div>

      {!result ? (
        <Card>
          <CardHeader>
            <CardTitle>Upload Bank Statement</CardTitle>
            <CardDescription>
              Upload a PDF bank statement. The system will filter out SHIFT4/PYMT, DEPOSIT, and CHERRY/PAYMENT transactions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/10'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <IconFileUpload className="mx-auto h-12 w-12 text-muted-foreground" />
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">
                  Drag and drop your PDF here, or{' '}
                  <label className="font-medium text-primary hover:text-primary/80 cursor-pointer">
                    browse
                    <input
                      type="file"
                      className="sr-only"
                      accept=".pdf"
                      multiple
                      onChange={handleFileSelect}
                    />
                  </label>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF files only
                </p>
              </div>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-2">
                      <IconCheck className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">{file.name}</span>
                      <Badge variant="secondary">{(file.size / 1024 / 1024).toFixed(2)} MB</Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeFile(index)}>
                      <IconX className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="text-sm text-muted-foreground">
                  {files.length} file{files.length > 1 ? 's' : ''} ready for processing
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="flex justify-end">
              <Button 
                onClick={processFiles} 
                disabled={files.length === 0 || isProcessing}
                className="min-w-[120px]"
              >
                {isProcessing ? 'Processing...' : `Process ${files.length} File${files.length > 1 ? 's' : ''}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{result.summary.totalDeposits}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${result.summary.totalAmount.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Offices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  {(result.offices || [result.office]).filter(Boolean).join(', ') || 'Unknown'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Files Processed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{result.fileResults?.length || 1}</div>
              </CardContent>
            </Card>
          </div>

          {/* Results Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Filtered Deposits</CardTitle>
                  <CardDescription>
                    Excluding SHIFT4/PYMT, DEPOSIT, and CHERRY/PAYMENT transactions
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button onClick={downloadCSV} variant="outline" size="sm">
                    <IconDownload className="h-4 w-4 mr-2" />
                    Download CSV
                  </Button>
                  <Button onClick={sendToGoogleSheets} variant="default" size="sm" 
                          className="bg-green-600 hover:bg-green-700"
                          disabled={isSendingToSheets}>
                    <IconFileUpload className="h-4 w-4 mr-2" />
                    {isSendingToSheets ? 'Sending...' : 'Send to Google Sheets'}
                  </Button>
                  <Button onClick={resetUpload} variant="outline" size="sm">
                    Upload New File
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  Showing {result.deposits.length} filtered deposit transactions
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <span>Sort by:</span>
                  <Button
                    variant={sortField === 'date' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSort('date')}
                    className="h-8 cursor-pointer"
                  >
                    Date {getSortIcon('date')}
                  </Button>
                </div>
              </div>
              
              <Table>
                <TableCaption>
                  Sorted by {sortField} ({sortDirection === 'asc' ? 'ascending' : 'descending'})
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer">
                      Date
                    </TableHead>
                    <TableHead className="cursor-pointer" >
                      Description 
                    </TableHead>
                    <TableHead className="text-right cursor-pointer" >
                      Amount 
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortDeposits(result.deposits).map((deposit, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{deposit.date}</TableCell>
                      <TableCell className="max-w-md truncate">{deposit.description}</TableCell>
                      <TableCell className="text-right font-mono">
                        ${deposit.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}