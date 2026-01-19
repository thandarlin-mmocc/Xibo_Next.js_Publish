'use client'

import { useEffect, useState } from 'react'
import { LogOut, Upload, Image as ImageIcon, Loader2, LayoutGrid, Square } from 'lucide-react'

type Artwork = {
    id: number
    title: string
    nickname: string
    imagePath: string
    status: 'pending' | 'approved' | 'rejected'
    rejectReason?: string
    createdAt: string
}

export default function TeacherPage() {
    const [artworks, setArtworks] = useState<Artwork[]>([])
    const [loading, setLoading] = useState(true)

    // Upload Form State
    const [title, setTitle] = useState('')
    const [nickname, setNickname] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)

    // View State
    const [viewMode, setViewMode] = useState<'grid' | 'large'>('grid')

    const fetchArtworks = async () => {
        const res = await fetch('/api/artworks')
        if (res.ok) {
            setArtworks(await res.json())
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchArtworks()
    }, [])

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file || !title || !nickname) return

        setUploading(true)
        const formData = new FormData()
        formData.append('title', title)
        formData.append('nickname', nickname)
        formData.append('file', file)

        const res = await fetch('/api/artworks', {
            method: 'POST',
            body: formData,
        })

        if (res.ok) {
            setTitle('')
            setNickname('')
            setFile(null)
            fetchArtworks()
        } else {
            alert('アップロードに失敗しました')
        }
        setUploading(false)
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'approved': return '承認済み';
            case 'rejected': return '却下';
            default: return '承認待ち';
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-700 border-green-200';
            case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <nav className="bg-white shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <span className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Teacher Dashboard</span>
                        </div>
                        <div className="flex items-center">
                            <span className="mr-4 text-sm text-gray-500 hidden sm:block">学校職員 (先生)</span>
                            <a href="/api/auth/logout" className="flex items-center text-gray-600 hover:text-red-500 transition-colors">
                                <LogOut className="w-5 h-5 mr-1" />
                                <span className="text-sm font-medium">ログアウト</span>
                            </a>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Upload Section */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-24">
                            <div className="flex items-center space-x-2 mb-6">
                                <div className="bg-blue-100 p-2 rounded-lg">
                                    <Upload className="w-5 h-5 text-blue-600" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">作品アップロード</h2>
                            </div>

                            <form onSubmit={handleUpload} className="space-y-4">
                                <div className="group">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">画像ファイル</label>
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors group-hover:border-blue-400">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            {file ? (
                                                <p className="text-sm text-gray-500 font-medium truncate max-w-[200px]">{file.name}</p>
                                            ) : (
                                                <>
                                                    <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                                                    <p className="text-sm text-gray-500">クリックして選択</p>
                                                </>
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={e => setFile(e.target.files?.[0] || null)}
                                            required
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">作品タイトル</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        required
                                        className="w-full p-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        placeholder="例: 夏休みの思い出"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ニックネーム (生徒名)</label>
                                    <input
                                        type="text"
                                        value={nickname}
                                        onChange={e => setNickname(e.target.value)}
                                        required
                                        className="w-full p-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        placeholder="例: たろう"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold shadow-md hover:bg-blue-700 hover:shadow-lg transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'アップロード'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* List Section */}
                    <div className="lg:col-span-2">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                            アップロード済み作品一覧
                            <span className="ml-3 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {artworks.length}
                            </span>
                        </h2>

                        <div className="flex justify-end mb-4">
                            <div className="bg-gray-100 p-1 rounded-lg flex space-x-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                                    title="一覧表示"
                                >
                                    <LayoutGrid className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setViewMode('large')}
                                    className={`p-2 rounded-md transition-all ${viewMode === 'large' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                                    title="大きく表示"
                                >
                                    <Square className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                            </div>
                        ) : (
                            <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                                {artworks.map(art => (
                                    <div key={art.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow duration-300 group">
                                        <div className="aspect-video bg-gray-100 overflow-hidden relative">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={art.imagePath}
                                                alt={art.title}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                            <div className="absolute top-2 right-2">
                                                <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase border shadow-sm ${getStatusColor(art.status)}`}>
                                                    {getStatusLabel(art.status)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-5">
                                            <h3 className="font-bold text-lg text-gray-900 mb-1">{art.title}</h3>
                                            <p className="text-gray-500 text-sm mb-4">作成者: {art.nickname}</p>

                                            {art.status === 'rejected' && (
                                                <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-600">
                                                    <span className="font-bold block text-xs uppercase mb-1">却下理由</span>
                                                    {art.rejectReason}
                                                </div>
                                            )}
                                            <div className="mt-4 text-xs text-gray-400 text-right">
                                                {new Date(art.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {artworks.length === 0 && (
                                    <div className="col-span-2 text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300 text-gray-500">
                                        <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p>まだ作品がありません</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
