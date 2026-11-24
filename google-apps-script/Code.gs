// ============================================================
// GOOGLE APPS SCRIPT — Backend for ZTOI Interest Registration
//
// HOW TO USE:
// 1. Go to script.google.com → New project
// 2. Paste this ENTIRE file into the editor
// 3. Replace SHEET_ID below with your Google Spreadsheet ID
// 4. Click Deploy → New deployment → Web app
//    - Execute as: Me (your Google account)
//    - Who has access: Anyone
// 5. Copy the Web App URL → paste into VITE_APPS_SCRIPT_URL in .env.local
// ============================================================

const SHEET_ID = 'YOUR_GOOGLE_SPREADSHEET_ID_HERE'  // ← replace this
const TAB_NAME = 'Interested Customers'

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents)
    const email = (data.email || '').toLowerCase().trim()
    const fullName = (data.fullName || '').trim()
    const registeredAt = data.registeredAt || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })

    if (!email || !fullName) {
      return jsonResponse({ status: 'error', message: 'Missing required fields' })
    }

    const sheet = getOrCreateSheet()

    // Check for duplicate
    const emails = sheet.getRange(2, 2, Math.max(sheet.getLastRow() - 1, 1), 1).getValues().flat()
    if (emails.includes(email)) {
      return jsonResponse({ status: 'already_registered', message: "You're already registered!" })
    }

    // Append new row
    sheet.appendRow([fullName, email, registeredAt])

    return jsonResponse({ status: 'success', message: "You're on the list!" })

  } catch (err) {
    return jsonResponse({ status: 'error', message: 'Server error: ' + err.message })
  }
}

function doGet(e) {
  // Health check
  return jsonResponse({ status: 'ok', message: 'ZTOI registration endpoint is running.' })
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID)
  let sheet = ss.getSheetByName(TAB_NAME)

  if (!sheet) {
    sheet = ss.insertSheet(TAB_NAME)
  }

  // Ensure header row exists
  if (sheet.getLastRow() === 0) {
    const header = sheet.getRange(1, 1, 1, 3)
    header.setValues([['Full Name', 'Gmail Address', 'Registered At']])
    header.setFontWeight('bold')
  }

  return sheet
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}
