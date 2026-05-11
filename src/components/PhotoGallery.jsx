import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Camera, Upload, X, Image as ImageIcon, Trash2, Tag } from 'lucide-react'
import { format } from 'date-fns'

const PHOTO_TYPES = [
  { id: 'before', label: 'Before', color: 'bg-amber-100 text-amber-800' },
  { id: 'after', label: 'After', color: 'bg-emerald-100 text-emerald-800' },
  { id: 'issue', label: 'Issue', color: 'bg-red-100 text-red-800' },
  { id: 'parts', label: 'Parts', color: 'bg-blue-100 text-blue-800' },
  { id: 'general', label: 'General', color: 'bg-slate-100 text-slate-600' },
]

export function PhotoGallery({ jobId }) {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [lightboxUrl, setLightboxUrl] = useState(null)
  const fileInputRef = useRef(null)
  const [selectedType, setSelectedType] = useState('general')
  const [filterType, setFilterType] = useState('all')

  useEffect(() => {
    if (jobId) loadPhotos()
  }, [jobId])

  async function loadPhotos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('job_photos')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Generate signed URLs for each photo
    const photosWithUrls = await Promise.all((data || []).map(async (photo) => {
      const { data: urlData } = await supabase.storage
        .from('job-photos')
        .createSignedUrl(photo.storage_path, 3600)
      return { ...photo, signed_url: urlData?.signedUrl }
    }))

    setPhotos(photosWithUrls)
    setLoading(false)
  }

  async function handleUpload(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setUploading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        setError(`${file.name} is over 10MB`)
        continue
      }

      const fileExt = file.name.split('.').pop().toLowerCase()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`
      const path = `${jobId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('job-photos')
        .upload(path, file)

      if (uploadError) {
        setError(`Upload failed: ${uploadError.message}`)
        continue
      }

      await supabase.from('job_photos').insert({
        job_id: jobId,
        uploaded_by: user?.id,
        storage_path: path,
        photo_type: selectedType,
        file_size: file.size,
        mime_type: file.type,
      })
    }

    setUploading(false)
    e.target.value = ''
    loadPhotos()
  }

  async function deletePhoto(photo) {
    if (!confirm('Delete this photo?')) return

    await supabase.storage.from('job-photos').remove([photo.storage_path])
    await supabase.from('job_photos').delete().eq('id', photo.id)
    loadPhotos()
  }

  async function updateCaption(photoId, caption) {
    await supabase.from('job_photos').update({ caption }).eq('id', photoId)
    loadPhotos()
  }

  async function updateType(photoId, photo_type) {
    await supabase.from('job_photos').update({ photo_type }).eq('id', photoId)
    loadPhotos()
  }

  const filtered = filterType === 'all' ? photos : photos.filter(p => p.photo_type === filterType)
  const counts = PHOTO_TYPES.reduce((acc, t) => {
    acc[t.id] = photos.filter(p => p.photo_type === t.id).length
    return acc
  }, {})

  return (
    <>
      <div className="card overflow-hidden">
        <div className="card-header">
          <span className="card-title-serif flex items-center gap-2">
            <Camera size={14} /> Photos ({photos.length})
          </span>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-xs text-navy-200 hover:text-white flex items-center gap-1"
          >
            <Upload size={12} /> {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleUpload}
          className="hidden"
        />

        <div className="px-4 py-3 border-b border-navy-50">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Tag as:</span>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="input py-1 text-xs w-28"
              >
                {PHOTO_TYPES.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-1 flex-wrap">
              <button onClick={() => setFilterType('all')}
                className={filterType === 'all' ? 'pill pill-unassigned' : 'pill bg-white border border-navy-100 text-slate-500'}>
                All ({photos.length})
              </button>
              {PHOTO_TYPES.map(t => counts[t.id] > 0 && (
                <button key={t.id} onClick={() => setFilterType(t.id)}
                  className={filterType === t.id ? `pill ${t.color}` : 'pill bg-white border border-navy-100 text-slate-500'}>
                  {t.label} ({counts[t.id]})
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-b border-red-200 text-red-800 px-4 py-2 text-xs">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading photos…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <ImageIcon size={28} className="text-navy-200 mx-auto mb-3" />
            <p className="text-sm text-slate-500 mb-3">
              {photos.length === 0 ? 'No photos yet' : `No ${filterType} photos`}
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-secondary inline-flex items-center gap-2 text-xs"
            >
              <Camera size={14} /> Upload Photos
            </button>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map(photo => {
              const typeConfig = PHOTO_TYPES.find(t => t.id === photo.photo_type)
              return (
                <div key={photo.id} className="group relative">
                  <button
                    onClick={() => setLightboxUrl(photo.signed_url)}
                    className="block w-full aspect-square bg-navy-50 rounded overflow-hidden border border-navy-100 hover:border-ember-300 transition-colors"
                  >
                    {photo.signed_url ? (
                      <img src={photo.signed_url} alt={photo.caption || 'Job photo'}
                        className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <ImageIcon size={24} />
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => deletePhoto(photo)}
                    className="absolute top-1 right-1 bg-white/90 text-red-600 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                    aria-label="Delete"
                  >
                    <Trash2 size={12} />
                  </button>

                  <div className="absolute top-1 left-1">
                    <select
                      value={photo.photo_type}
                      onChange={(e) => updateType(photo.id, e.target.value)}
                      className={`pill ${typeConfig?.color || 'bg-white'} text-[9px] border-0 outline-none cursor-pointer opacity-90 hover:opacity-100`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {PHOTO_TYPES.map(t => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <input
                    type="text"
                    placeholder="Add caption…"
                    defaultValue={photo.caption || ''}
                    onBlur={(e) => { if (e.target.value !== (photo.caption || '')) updateCaption(photo.id, e.target.value) }}
                    className="w-full mt-1 text-[11px] px-1.5 py-0.5 bg-transparent border-0 border-b border-navy-100 focus:border-ember-500 focus:outline-none text-navy-900 placeholder-slate-400"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">{format(new Date(photo.created_at), 'MMM d, h:mm a')}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 bg-navy-950/90 z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <button onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 text-white hover:text-ember-500">
            <X size={28} />
          </button>
          <img src={lightboxUrl} alt="" className="max-h-full max-w-full rounded shadow-elevated" />
        </div>
      )}
    </>
  )
}
