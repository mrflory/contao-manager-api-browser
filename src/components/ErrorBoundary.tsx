import { Component, ErrorInfo, ReactNode } from 'react';
import ErrorPage from '../pages/ErrorPage';

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component to catch and display React errors
 * Wraps the application to provide user-friendly error handling
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Log error details for debugging
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        this.setState({
            error,
            errorInfo
        });
    }

    render(): ReactNode {
        if (this.state.hasError) {
            // Parse error message to determine if it's a known error type
            const errorMessage = this.state.error?.message || '';
            let statusCode = 500;
            let title = 'Something Went Wrong';
            let message = errorMessage;

            // Check for rate limit errors
            if (errorMessage.includes('Too many requests') || errorMessage.includes('429')) {
                statusCode = 429;
                title = 'Too Many Requests';
                message = 'You have made too many requests. Please wait a few minutes and try again.';
            }
            // Check for authentication errors
            else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
                statusCode = 401;
                title = 'Authentication Required';
                message = 'Please log in to access this resource.';
            }
            // Check for permission errors
            else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
                statusCode = 403;
                title = 'Access Denied';
                message = 'You do not have permission to access this resource.';
            }
            // Check for not found errors
            else if (errorMessage.includes('404') || errorMessage.includes('Not found')) {
                statusCode = 404;
                title = 'Not Found';
                message = 'The requested resource could not be found.';
            }

            return (
                <ErrorPage
                    statusCode={statusCode}
                    title={title}
                    message={message}
                    showHomeButton={true}
                />
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
