'use client'

import {
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'

export interface AutocompleteOption {
  key?: string
  value: string
  meta?: string
}

function joinClassNames(...values: Array<string | undefined | false | null>) {
  return values.filter(Boolean).join(' ')
}

export function AutocompleteInput({
  value,
  onValueChange,
  suggestions,
  onSelect,
  onCommit,
  trailing,
  wrapperClassName,
  inputClassName,
  panelClassName,
  optionClassName,
  ...inputProps
}: Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'onSelect'
> & {
  value: string
  onValueChange: (value: string) => void
  suggestions: AutocompleteOption[]
  onSelect?: (option: AutocompleteOption) => void
  onCommit?: (value: string) => void
  trailing?: ReactNode
  wrapperClassName?: string
  inputClassName?: string
  panelClassName?: string
  optionClassName?: string
}) {
  const blurTimeoutRef = useRef<number | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current !== null) {
        window.clearTimeout(blurTimeoutRef.current)
      }
    }
  }, [])

  const closeSuggestions = () => {
    setIsOpen(false)
    setHighlightedIndex(-1)
  }

  const selectSuggestion = (option: AutocompleteOption) => {
    onValueChange(option.value)
    onSelect?.(option)
    closeSuggestions()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      if (suggestions.length === 0) {
        return
      }

      event.preventDefault()
      setIsOpen(true)
      setHighlightedIndex((current) =>
        current < 0
          ? 0
          : Math.min(current + 1, suggestions.length - 1),
      )
      return
    }

    if (event.key === 'ArrowUp') {
      if (suggestions.length === 0) {
        return
      }

      event.preventDefault()
      setIsOpen(true)
      setHighlightedIndex((current) => (current <= 0 ? 0 : current - 1))
      return
    }

    if (event.key === 'Escape') {
      closeSuggestions()
      return
    }

    if (event.key !== 'Enter') {
      return
    }

    if (!onCommit && (!isOpen || highlightedIndex < 0)) {
      return
    }

    event.preventDefault()

    if (isOpen && highlightedIndex >= 0 && suggestions[highlightedIndex]) {
      selectSuggestion(suggestions[highlightedIndex])
      return
    }

    onCommit?.(value)
    closeSuggestions()
  }

  return (
    <div className="relative">
      <div className={wrapperClassName}>
        <input
          {...inputProps}
          value={value}
          onChange={(event) => {
            onValueChange(event.target.value)
            setIsOpen(true)
          }}
          onFocus={(event) => {
            inputProps.onFocus?.(event)
            if (suggestions.length > 0) {
              setIsOpen(true)
            }
          }}
          onBlur={(event) => {
            inputProps.onBlur?.(event)
            blurTimeoutRef.current = window.setTimeout(() => {
              closeSuggestions()
            }, 120)
          }}
          onKeyDown={(event) => {
            inputProps.onKeyDown?.(event)
            if (!event.defaultPrevented) {
              handleKeyDown(event)
            }
          }}
          className={inputClassName}
        />
        {trailing}
      </div>

      {isOpen && suggestions.length > 0 ? (
        <div
          className={joinClassNames(
            'absolute left-0 right-0 top-[calc(100%+0.6rem)] z-30 overflow-hidden rounded-[24px] border border-border bg-background shadow-2xl',
            panelClassName,
          )}
          role="listbox"
        >
          {suggestions.map((suggestion, index) => {
            const isActive = index === highlightedIndex

            return (
              <button
                key={suggestion.key ?? `${suggestion.value}:${index}`}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault()
                  selectSuggestion(suggestion)
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={joinClassNames(
                  'flex w-full items-center justify-between gap-3 border-b border-border/60 px-4 py-3 text-left text-sm transition last:border-b-0',
                  isActive ? 'bg-brand-soft/50' : 'hover:bg-brand-soft/40',
                  optionClassName,
                )}
                role="option"
                aria-selected={isActive}
              >
                <span className="font-medium text-foreground">{suggestion.value}</span>
                {suggestion.meta ? (
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    {suggestion.meta}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
