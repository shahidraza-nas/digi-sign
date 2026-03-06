"use client";

import { Component } from "react";

/**
 * ErrorBoundary — catches unhandled React render errors and shows a
 * friendly fallback instead of white-screening the entire app.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "40vh",
            padding: "48px 24px",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
          }}
          role="alert"
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#d32f2f"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h2 style={{ fontSize: "20px", fontWeight: 600, color: "#d32f2f", margin: "16px 0 8px" }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: "14px", color: "#78909c", maxWidth: "400px", margin: "0 0 20px" }}>
            An unexpected error occurred. Please try again or reload the page.
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: "10px 28px",
              border: "none",
              borderRadius: "24px",
              background: "#e91e63",
              color: "#fff",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
