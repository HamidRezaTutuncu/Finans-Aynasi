import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('finans_token'))
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('finans_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(true)

  // Başlangıçta token varsa kullanıcı bilgisini doğrula
  useEffect(() => {
    const verifyToken = async () => {
      const storedToken = localStorage.getItem('finans_token')
      if (!storedToken) {
        setLoading(false)
        return
      }

      try {
        const res = await api.get('/auth/me')
        setUser(res.data.user || res.data)
      } catch {
        // Token geçersizse temizle
        localStorage.removeItem('finans_token')
        localStorage.removeItem('finans_user')
        setToken(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    verifyToken()
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    const { token: newToken, user: newUser } = res.data

    localStorage.setItem('finans_token', newToken)
    localStorage.setItem('finans_user', JSON.stringify(newUser))

    setToken(newToken)
    setUser(newUser)

    return { token: newToken, user: newUser }
  }, [])

  const register = useCallback(async (formData) => {
    const res = await api.post('/auth/register', formData)
    const { token: newToken, user: newUser } = res.data

    localStorage.setItem('finans_token', newToken)
    localStorage.setItem('finans_user', JSON.stringify(newUser))

    setToken(newToken)
    setUser(newUser)

    return { token: newToken, user: newUser }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('finans_token')
    localStorage.removeItem('finans_user')
    setToken(null)
    setUser(null)
  }, [])

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser)
    localStorage.setItem('finans_user', JSON.stringify(updatedUser))
  }, [])

  const value = {
    token,
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!token,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth, AuthProvider içinde kullanılmalıdır')
  }
  return context
}

export default AuthContext
