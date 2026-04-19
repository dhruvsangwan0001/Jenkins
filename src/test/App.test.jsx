import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App, { add, multiply, greet } from '../App'

// ──────────────────────────────────────────
// Unit Tests: Pure utility functions
// ──────────────────────────────────────────

describe('Utility: add()', () => {
  it('should add two positive numbers', () => {
    expect(add(2, 3)).toBe(5)
  })

  it('should return 0 when adding zeros', () => {
    expect(add(0, 0)).toBe(0)
  })

  it('should handle negative numbers', () => {
    expect(add(-5, 3)).toBe(-2)
  })

  it('should handle large numbers', () => {
    expect(add(1000000, 2000000)).toBe(3000000)
  })
})

describe('Utility: multiply()', () => {
  it('should multiply two positive numbers', () => {
    expect(multiply(3, 4)).toBe(12)
  })

  it('should return 0 when multiplied by zero', () => {
    expect(multiply(5, 0)).toBe(0)
  })

  it('should handle negative multiplication', () => {
    expect(multiply(-3, 4)).toBe(-12)
  })
})

describe('Utility: greet()', () => {
  it('should return default greeting when no name', () => {
    expect(greet('')).toBe('Hello, World!')
  })

  it('should return personalized greeting', () => {
    expect(greet('Alice')).toBe('Hello, Alice!')
  })

  it('should handle undefined name', () => {
    expect(greet(undefined)).toBe('Hello, World!')
  })

  it('should handle null name', () => {
    expect(greet(null)).toBe('Hello, World!')
  })
})

// ──────────────────────────────────────────
// Integration Tests: React Component
// ──────────────────────────────────────────

describe('App Component: Counter', () => {
  it('renders counter with initial value 0', () => {
    render(<App />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('increments counter on + button click', () => {
    render(<App />)
    const incrementBtn = screen.getByLabelText('Increment counter')
    fireEvent.click(incrementBtn)
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('decrements counter on − button click', () => {
    render(<App />)
    const decrementBtn = screen.getByLabelText('Decrement counter')
    fireEvent.click(decrementBtn)
    expect(screen.getByText('-1')).toBeInTheDocument()
  })

  it('resets counter to 0', () => {
    render(<App />)
    const incrementBtn = screen.getByLabelText('Increment counter')
    const resetBtn = screen.getByLabelText('Reset counter')
    fireEvent.click(incrementBtn)
    fireEvent.click(incrementBtn)
    fireEvent.click(resetBtn)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('shows correct sum (count + 10)', () => {
    render(<App />)
    const incrementBtn = screen.getByLabelText('Increment counter')
    fireEvent.click(incrementBtn)
    // count is 1, sum = 1 + 10 = 11
    expect(screen.getByText('11')).toBeInTheDocument()
  })
})

describe('App Component: Greeter', () => {
  it('renders the greeting input', () => {
    render(<App />)
    expect(screen.getByPlaceholderText('Enter your name...')).toBeInTheDocument()
  })

  it('shows greeting on button click', () => {
    render(<App />)
    const input = screen.getByLabelText('Name input')
    const button = screen.getByText('Greet')
    fireEvent.change(input, { target: { value: 'DevOps' } })
    fireEvent.click(button)
    expect(screen.getByText('Hello, DevOps!')).toBeInTheDocument()
  })

  it('shows World greeting when name is empty', () => {
    render(<App />)
    const button = screen.getByText('Greet')
    fireEvent.click(button)
    expect(screen.getByText('Hello, World!')).toBeInTheDocument()
  })
})

describe('App Component: Pipeline Stages', () => {
  it('renders all 7 pipeline stages', () => {
    render(<App />)
    const stages = ['Build', 'Test', 'Code Quality', 'Security', 'Deploy', 'Release', 'Monitoring']
    stages.forEach(stage => {
      expect(screen.getByText(stage)).toBeInTheDocument()
    })
  })
})
