import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { eventBus } from '../../lib/eventBus'

export function HostNavigationListener() {
  const navigate = useNavigate()

  useEffect(() => {
    const handler = ({ path }: { path: string }) => {
      if (path) {
        void navigate(path)
      }
    }

    const off = eventBus.on('host:navigate', handler)
    return () => {
      off()
    }
  }, [navigate])

  return null
}
