import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { describeLinkUrl, shortenId } from '../shared/utils/link-preview.ts'

const SHEET = 'https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit'

describe('describeLinkUrl', () => {
  test('says nothing useful about empty or broken input', () => {
    assert.equal(describeLinkUrl('').valid, false)
    assert.equal(describeLinkUrl('   ').valid, false)
    assert.equal(describeLinkUrl('not a url').valid, false)
    assert.equal(describeLinkUrl('docs.google.com/spreadsheets').valid, false)
  })

  test('recognises a spreadsheet and pulls out its id', () => {
    const preview = describeLinkUrl(SHEET)

    assert.equal(preview.valid, true)
    assert.equal(preview.secure, true)
    assert.equal(preview.kind, 'sheets')
    assert.equal(preview.label, 'Google Sheets')
    assert.equal(preview.documentId, '1AbCdEfGhIjKlMnOpQrStUvWxYz')
    assert.equal(preview.tabId, undefined)
  })

  test('finds the tab id in the fragment or the query', () => {
    assert.equal(describeLinkUrl(`${SHEET}#gid=1234`).tabId, '1234')
    assert.equal(describeLinkUrl(`${SHEET}?gid=99`).tabId, '99')
    assert.equal(describeLinkUrl(`${SHEET}?gid=99#gid=1234`).tabId, '99')
  })

  test('tells the Google document types apart', () => {
    assert.equal(describeLinkUrl('https://docs.google.com/document/d/abc/edit').kind, 'docs')
    assert.equal(describeLinkUrl('https://docs.google.com/presentation/d/abc/edit').kind, 'slides')
    assert.equal(describeLinkUrl('https://docs.google.com/forms/d/abc/edit').kind, 'forms')
  })

  test('recognises a Drive folder', () => {
    const preview = describeLinkUrl('https://drive.google.com/drive/folders/FOLDER123')

    assert.equal(preview.kind, 'drive')
    assert.equal(preview.documentId, 'FOLDER123')
  })

  test('falls back to the host for anything else', () => {
    const preview = describeLinkUrl('https://example.com/some/report')

    assert.equal(preview.valid, true)
    assert.equal(preview.kind, 'other')
    assert.equal(preview.label, 'example.com')
    assert.equal(preview.documentId, undefined)
  })

  test('flags a link that is not https', () => {
    const preview = describeLinkUrl('http://docs.google.com/spreadsheets/d/abc/edit')

    assert.equal(preview.valid, true)
    assert.equal(preview.secure, false)
    assert.equal(preview.kind, 'sheets')
  })

  test('does not mistake a Google account path for a document id', () => {
    assert.equal(describeLinkUrl('https://docs.google.com/spreadsheets/u/0/').documentId, undefined)
  })

  test('handles the multi-account form that inserts an account index', () => {
    const preview = describeLinkUrl('https://docs.google.com/spreadsheets/u/0/d/SHEET42/edit#gid=7')

    assert.equal(preview.kind, 'sheets')
    assert.equal(preview.documentId, 'SHEET42')
    assert.equal(preview.tabId, '7')
  })
})

describe('shortenId', () => {
  test('leaves a short id alone', () => {
    assert.equal(shortenId('abc123'), 'abc123')
  })

  test('elides the middle of a long one', () => {
    assert.equal(shortenId('1AbCdEfGhIjKlMnOpQrStUvWxYz'), '1AbCdEfG…WxYz')
  })
})
