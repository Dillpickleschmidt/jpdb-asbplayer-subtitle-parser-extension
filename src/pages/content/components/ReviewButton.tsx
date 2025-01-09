// components/ReviewButton.tsx
type ReviewButtonProps = {
  label: string
  color: string
  disabled?: boolean
  loading?: boolean
  onClick: () => void
}

export function ReviewButton(props: ReviewButtonProps) {
  return (
    <button
      class="h-8 rounded-md border border-black px-1 text-black"
      style={{ "background-color": props.color }}
      onClick={props.onClick}
      disabled={props.disabled || props.loading}
    >
      {props.loading ? "..." : props.label}
    </button>
  )
}
