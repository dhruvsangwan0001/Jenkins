import { useState } from 'react'
import './App.css'

// Utility: calculator function (testable logic)
export function add(a, b) {
  return a + b
}

export function multiply(a, b) {
  return a * b
}

export function greet(name) {
  if (!name) return 'Hello, World!'
  return `Hello, ${name}!`
}

function App() {
  const [count, setCount] = useState(0)
  const [name, setName] = useState('')
  const [greeting, setGreeting] = useState('')

  const handleGreet = () => {
    setGreeting(greet(name))
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo-wrapper">
          <div className="logo-icon">⚙️</div>
          <h1>React Vite CI/CD Pipeline</h1>
        </div>
        <p className="subtitle">
          Production-grade DevOps pipeline with Jenkins, Docker, SonarQube, Trivy &amp; Prometheus
        </p>
      </header>

      <main className="app-main">
        <section className="card counter-card" id="counter-section">
          <h2>Interactive Counter</h2>
          <p className="counter-value" id="counter-display">{count}</p>
          <div className="button-group">
            <button
              id="btn-decrement"
              className="btn btn-secondary"
              onClick={() => setCount(c => c - 1)}
              aria-label="Decrement counter"
            >
              −
            </button>
            <button
              id="btn-reset"
              className="btn btn-outline"
              onClick={() => setCount(0)}
              aria-label="Reset counter"
            >
              Reset
            </button>
            <button
              id="btn-increment"
              className="btn btn-primary"
              onClick={() => setCount(c => c + 1)}
              aria-label="Increment counter"
            >
              +
            </button>
          </div>
          <p className="helper-text">
            Sum of count + 10 = <strong id="sum-display">{add(count, 10)}</strong>
          </p>
        </section>

        <section className="card greeter-card" id="greeter-section">
          <h2>Greeting Generator</h2>
          <div className="input-row">
            <input
              id="name-input"
              type="text"
              placeholder="Enter your name..."
              value={name}
              onChange={e => setName(e.target.value)}
              aria-label="Name input"
            />
            <button
              id="btn-greet"
              className="btn btn-primary"
              onClick={handleGreet}
            >
              Greet
            </button>
          </div>
          {greeting && (
            <p className="greeting-output" id="greeting-output" role="status">
              {greeting}
            </p>
          )}
        </section>

        <section className="card pipeline-card" id="pipeline-section">
          <h2>Pipeline Stages</h2>
          <div className="stages-grid">
            {[
              { icon: '🔨', label: 'Build', desc: 'npm build + Docker multi-stage' },
              { icon: '🧪', label: 'Test', desc: 'Vitest unit + coverage' },
              { icon: '🔍', label: 'Code Quality', desc: 'SonarQube quality gates' },
              { icon: '🛡️', label: 'Security', desc: 'npm audit + OWASP + Trivy' },
              { icon: '🚀', label: 'Deploy', desc: 'Docker Compose staging' },
              { icon: '🏷️', label: 'Release', desc: 'Git tag + Docker Hub push' },
              { icon: '📊', label: 'Monitoring', desc: 'Prometheus + Grafana' },
            ].map(({ icon, label, desc }) => (
              <div key={label} className="stage-badge" id={`stage-${label.toLowerCase().replace(' ', '-')}`}>
                <span className="stage-icon">{icon}</span>
                <strong>{label}</strong>
                <small>{desc}</small>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <p>Build #{import.meta.env.VITE_BUILD_NUMBER || 'local'} | {new Date().getFullYear()}</p>
      </footer>
    </div>
  )
}

export default App
