import { useParams } from 'react-router-dom'
import { InboxLayout } from './inbox/InboxLayout'

export function InboxItemPage() {
  const { itemId } = useParams()
  return <InboxLayout selectedItemId={itemId ?? null} />
}
