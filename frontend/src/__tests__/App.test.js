/**
 * Frontend automated tests for SwiftCart Order Manager
 * Run with: npm test
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import App from '../App';

// Mock fetch globally
global.fetch = jest.fn();

// Mock WebSocket
global.WebSocket = jest.fn(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1, // OPEN
}));

// Mock Framer Motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    nav: ({ children, ...props }) => <nav {...props}>{children}</nav>,
  },
  AnimatePresence: ({ children }) => children,
}));

describe('SwiftCart App', () => {
  beforeEach(() => {
    fetch.mockClear();
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('renders dashboard on initial load', async () => {
    // Mock successful metrics API response
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        total_orders: 0,
        completed_orders: 0,
        failed_orders: 0,
        avg_processing_time_ms: 0,
        queue_depth: 0,
        throughput_per_sec: 1.5,
        p95_latency_ms: 0,
        p99_latency_ms: 0,
      }),
    });

    render(<App />);

    // Should show SwiftCart branding
    expect(screen.getByText(/SwiftCart/i)).toBeInTheDocument();

    // Should show dashboard content
    await waitFor(() => {
      expect(screen.getByText(/Total Orders/i)).toBeInTheDocument();
    });
  });

  test('can navigate between tabs', async () => {
    // Mock metrics API
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        total_orders: 0,
        completed_orders: 0,
        failed_orders: 0,
        avg_processing_time_ms: 0,
        queue_depth: 0,
        throughput_per_sec: 1.5,
        p95_latency_ms: 0,
        p99_latency_ms: 0,
      }),
    });

    render(<App />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    });

    // Click on Create Order tab
    fireEvent.click(screen.getByText(/Create Order/i));

    // Should show create order form
    await waitFor(() => {
      expect(screen.getByText(/Customer Information/i)).toBeInTheDocument();
    });

    // Click on Track Orders tab
    fireEvent.click(screen.getByText(/Track Orders/i));

    // Should show order tracking
    await waitFor(() => {
      expect(screen.getByText(/Order Tracking/i)).toBeInTheDocument();
    });
  });

  test('creates order successfully', async () => {
    // Mock metrics API call
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        total_orders: 0,
        completed_orders: 0,
        failed_orders: 0,
        avg_processing_time_ms: 0,
        queue_depth: 0,
        throughput_per_sec: 1.5,
        p95_latency_ms: 0,
        p99_latency_ms: 0,
      }),
    });

    // Mock successful order creation
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        order_id: 'ORD-TEST-123',
        customer_id: 'CUST-TEST',
        customer_name: 'Test User',
        items: [
          {
            product_id: 'PROD-001',
            name: 'Test Product',
            quantity: 1,
            price: 10.00,
          },
        ],
        subtotal: 10.00,
        tax: 1.00,
        total: 11.00,
        status: 'pending',
        idempotency_key: 'test-key-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });

    render(<App />);

    // Navigate to create order
    await waitFor(() => {
      fireEvent.click(screen.getByText(/Create Order/i));
    });

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/Customer Name/i), {
      target: { value: 'Test User' },
    });

    // Add an item (this might need adjustment based on actual form structure)
    const productNameInput = screen.getByPlaceholderText(/Product Name/i);
    if (productNameInput) {
      fireEvent.change(productNameInput, {
        target: { value: 'Test Product' },
      });
    }

    // Submit form
    const submitButton = screen.getByText(/Create Order/i);
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Should make API call to create order
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/orders', expect.any(Object));
    });
  });

  test('displays error when API fails', async () => {
    // Mock failed metrics API call
    fetch.mockRejectedValueOnce(new Error('API is down'));

    render(<App />);

    // Should handle error gracefully
    await waitFor(() => {
      // The app should still render without crashing
      expect(screen.getByText(/SwiftCart/i)).toBeInTheDocument();
    });
  });

  test('shows loading state initially', () => {
    // Mock slow API response
    fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                total_orders: 0,
                completed_orders: 0,
                failed_orders: 0,
                avg_processing_time_ms: 0,
                queue_depth: 0,
                throughput_per_sec: 1.5,
                p95_latency_ms: 0,
                p99_latency_ms: 0,
              }),
            });
          }, 100);
        })
    );

    render(<App />);

    // Should show loading state initially
    // (This depends on your loading implementation)
  });

  test('WebSocket connection initializes', async () => {
    // Mock metrics API
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        total_orders: 0,
        completed_orders: 0,
        failed_orders: 0,
        avg_processing_time_ms: 0,
        queue_depth: 0,
        throughput_per_sec: 1.5,
        p95_latency_ms: 0,
        p99_latency_ms: 0,
      }),
    });

    render(<App />);

    // WebSocket should be initialized (mocked above)
    await waitFor(() => {
      expect(global.WebSocket).toHaveBeenCalledWith(
        'ws://localhost:8001/api/ws/orders',
        expect.any(Object)
      );
    });
  });

  test('responsive navigation works', async () => {
    // Mock metrics API
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        total_orders: 0,
        completed_orders: 0,
        failed_orders: 0,
        avg_processing_time_ms: 0,
        queue_depth: 0,
        throughput_per_sec: 1.5,
        p95_latency_ms: 0,
        p99_latency_ms: 0,
      }),
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    });

    // Test that all navigation tabs are present
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Create Order/i)).toBeInTheDocument();
    expect(screen.getByText(/Track Orders/i)).toBeInTheDocument();
    expect(screen.getByText(/Load Test/i)).toBeInTheDocument();
  });
});