interface EmptyStateProps {
  title: string
  description?: string
}

export default function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <p className="text-text-secondary text-lg font-medium">{title}</p>
      {description && <p className="text-text-secondary text-sm mt-1">{description}</p>}
    </div>
  )
}
