import api from "@/api/axios"

// Read API configuration from environment (Vite .env)
const API_KEY = import.meta.env.VITE_API_KEY
const API_AI = (import.meta.env.VITE_API_AI).replace(/\/$/, '')

export async function askChat(payload) {
  try {
    const url = API_AI + '/chat'
    const res = await api.post(url, payload, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    })
    return res.data
  } catch (err) {
    const msg = err?.response?.data?.detail || err.message || 'API error'
    throw new Error(msg)
  }
}

/**
 * uploadDoc(file, onUploadProgress)
 * - Uploads a File object to the backend /docs/upload endpoint
 * - Accepts an optional onUploadProgress callback (axios style)
 * - Returns response data (expected to include job_id)
 */
export async function uploadDoc(file, onUploadProgress) {
  try {
    const fd = new FormData()
    fd.append('file', file)
    const url = API_AI + '/docs/upload'
    const res = await api.post(url, fd, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    })
    return res.data
  } catch (err) {
    const msg = err?.response?.data?.detail || err.message || 'Upload error'
    throw new Error(msg)
  }
}

/**
 * getDocStatus(jobId)
 * - Fetches job status from /docs/status/{jobId}
 */
export async function getDocStatus(jobId) {
  try {
    const url = `${API_AI}/docs/status/${jobId}`
    const res = await api.get(url, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    return res.data
  } catch (err) {
    const msg = err?.response?.data?.detail || err.message || 'Status error'
    throw new Error(msg)
  }
}