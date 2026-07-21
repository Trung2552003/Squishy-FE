import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/cms/dashboard')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/cms/dashboard"!</div>
}
