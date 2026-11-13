/* eslint-disable @typescript-eslint/no-explicit-any */
interface Props {
  condition?: any
  children?: React.ReactNode
}

export function RenderComponent({ children, condition }: Props) {
  return condition ? <>{children}</> : null
}
