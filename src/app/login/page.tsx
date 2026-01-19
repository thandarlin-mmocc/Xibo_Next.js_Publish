'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { User, School, ArrowRight, Video } from 'lucide-react'

export default function LoginPage() {
    const router = useRouter()
    const [type, setType] = useState<'teacher' | 'admin'>('teacher')
    const [formData, setFormData] = useState({ code: '', username: '', password: '' })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        const credentials = type === 'teacher'
            ? { code: formData.code, password: formData.password }
            : { username: formData.username, password: formData.password }

        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, credentials }),
        })

        if (res.ok) {
            const data = await res.json()
            if (data.user.role === 'teacher') router.push('/teacher')
            else router.push('/admin')
        } else {
            const data = await res.json()
            setError(data.error === 'Invalid school code or password' ? '学校コードまたはパスワードが正しくありません' :
                data.error === 'Invalid admin credentials' ? '管理者IDまたはパスワードが正しくありません' : 'ログインに失敗しました')
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-premium flex items-center justify-center p-4">
            <div className="glass-panel p-10 rounded-2xl shadow-2xl w-full max-w-md backdrop-blur-xl animate-fade-in relative overflow-hidden">
                {/* Decorative background element inside card */}
                <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
                <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>

                <div className="flex flex-col items-center mb-8 relative z-10">
                    <div className="bg-white/20 p-3 rounded-full mb-4 shadow-inner">
                        <Video className="w-8 h-8 text-blue-600" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Xibo PoC</h1>
                    <p className="text-gray-500 text-sm mt-1">デジタルサイネージ管理システム</p>
                </div>

                <div className="flex mb-8 bg-gray-100/50 p-1 rounded-lg backdrop-blur-sm relative z-10">
                    <button
                        className={`flex-1 flex items-center justify-center py-2 rounded-md text-sm font-medium transition-all duration-300 ${type === 'teacher' ? 'bg-white text-blue-600 shadow-sm transform scale-105' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setType('teacher')}
                    >
                        <School className="w-4 h-4 mr-2" />
                        学校職員
                    </button>
                    <button
                        className={`flex-1 flex items-center justify-center py-2 rounded-md text-sm font-medium transition-all duration-300 ${type === 'admin' ? 'bg-white text-blue-600 shadow-sm transform scale-105' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setType('admin')}
                    >
                        <User className="w-4 h-4 mr-2" />
                        管理者
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    {type === 'teacher' ? (
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">学校コード</label>
                            <input
                                type="text"
                                className="w-full p-3 bg-white/50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-gray-800 placeholder-gray-400"
                                value={formData.code}
                                onChange={e => setFormData({ ...formData, code: e.target.value })}
                                required
                                placeholder="SCH001"
                            />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">管理者ID</label>
                            <input
                                type="text"
                                className="w-full p-3 bg-white/50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-gray-800 placeholder-gray-400"
                                value={formData.username}
                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                                required
                                placeholder="admin"
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">パスワード</label>
                        <input
                            type="password"
                            className="w-full p-3 bg-white/50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-gray-800 placeholder-gray-400"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            required
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center animate-pulse">
                            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-bold shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        ) : (
                            <>
                                ログイン <ArrowRight className="ml-2 w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
