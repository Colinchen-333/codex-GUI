import { SwarmControlBar } from './SwarmControlBar'
import { SwarmTaskBoard } from './SwarmTaskBoard'
import { SwarmMessageFeed } from './SwarmMessageFeed'
import { SwarmWorkerCards } from './SwarmWorkerCards'
import { SwarmInput } from './SwarmInput'

export function SwarmView() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <SwarmControlBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Task Board */}
        <div className="w-[45%] border-r border-stroke/10 overflow-y-auto p-4">
          <SwarmTaskBoard />
        </div>
        {/* Right: Message Feed */}
        <div className="flex-1 overflow-y-auto p-4">
          <SwarmMessageFeed />
        </div>
      </div>

      {/* Worker status strip */}
      <SwarmWorkerCards />

      {/* Input area */}
      <SwarmInput />
    </div>
  )
}
