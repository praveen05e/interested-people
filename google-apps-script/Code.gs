// ============================================================
// GOOGLE APPS SCRIPT — Backend for ztoi Tech Interest Registration
//
// Supports:
// - Google, Hotmail, Outlook, Yahoo, and all email addresses
// - Automatic Country detection
// - Duplicate email prevention
// - Timestamp in Asia/Kolkata timezone
// ============================================================

const TAB_NAME = 'Interested Customers'

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents)
    const email = (data.email || '').toLowerCase().trim()
    const fullName = (data.fullName || email.split('@')[0]).trim()
    const country = (data.country || 'Unknown').trim()
    const registeredAt = data.registeredAt || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })

    if (!email) {
      return jsonResponse({ status: 'error', message: 'Missing email address' })
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet()
    let sheet = ss.getSheetByName(TAB_NAME) || ss.getActiveSheet()

    // Ensure header row exists with Country
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Full Name', 'Email Address', 'Country', 'Registered At'])
      sheet.getRange(1, 1, 1, 4).setFontWeight('bold')
    }

    // Check for duplicate
    const lastRow = sheet.getLastRow()
    if (lastRow > 1) {
      const emails = sheet.getRange(2, 2, lastRow - 1, 1).getValues().flat().map(function(s) {
        return (s || '').toString().toLowerCase().trim()
      })
      if (emails.includes(email)) {
        return jsonResponse({ status: 'already_registered', message: "You're already registered!" })
      }
    }

    // Append new customer row with Country
    sheet.appendRow([fullName, email, country, registeredAt])

    return jsonResponse({ status: 'success', message: "You're on the list!" })

  } catch (err) {
    return jsonResponse({ status: 'error', message: 'Server error: ' + err.message })
  }
}

function doGet(e) {
  return jsonResponse({ status: 'ok', message: 'ztoi Tech registration endpoint is active.' })
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}
