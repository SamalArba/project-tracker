/**
 * ================================================================
 * main.tsx - Application Entry Point
 * ================================================================
 * 
 * This is the main entry point for the React application.
 * It renders the root App component into the DOM and wraps
 * it with necessary providers (Router, StrictMode).
 */

// ================================================================
// IMPORTS
// ================================================================
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'

// ================================================================
// APPLICATION INITIALIZATION
// ================================================================
/**
 * Mount the React application to the #root element
 * 
 * Providers:
 * - React.StrictMode: Enables additional development checks
 * - BrowserRouter: Provides routing functionality
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
