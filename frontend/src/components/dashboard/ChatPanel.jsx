import Chat from './Chat'

export default function ChatPanel({ messages, setMessages }) {
  return <Chat messages={messages} setMessages={setMessages} />
}
