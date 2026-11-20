const databaseName = 'work-manual.files'
const storeName = 'attachments'

async function transact(mode, run) {
  const database = await new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(storeName, { keyPath: 'id' }).createIndex('scope', 'scope')
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, mode)
      const request = run(transaction.objectStore(storeName))
      transaction.oncomplete = () => resolve(request?.result)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    database.close()
  }
}

export function readOperationFiles(scope) {
  return transact('readonly', (store) => store.index('scope').getAll(scope))
}

export function storeOperationFiles(files) {
  return transact('readwrite', (store) => { files.forEach((file) => store.add(file)) })
}

export function removeOperationFiles(ids) {
  return transact('readwrite', (store) => { ids.forEach((id) => store.delete(id)) })
}

export function clearOperationFiles() {
  return transact('readwrite', (store) => store.clear())
}

export function downloadOperationFile(attachment) {
  const url = URL.createObjectURL(attachment.blob)
  const link = document.createElement('a')
  link.href = url
  link.download = attachment.name
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
