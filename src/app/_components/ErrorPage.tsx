"use client";

import { useState } from 'react';

interface ErrorPageProps {
    error: any | null;
    onRetry?: () => void;
    title?: string;
    message?: string;
}

// Helper function to get user-friendly error message
function getErrorMessage(error: any): { title: string; message: string } {
    if (!error) return { title: "Something went wrong", message: "An error occurred." };
    
    // Handle tRPC errors
    if (error.data?.code) {
        switch (error.data.code) {
            case "BAD_REQUEST":
                return {
                    title: "Invalid Request",
                    message: "The requested folder could not be found or accessed. Please check the URL and try again."
                };
            case "UNAUTHORIZED":
                return {
                    title: "Access Denied",
                    message: "You don't have permission to access this content. Please sign in again."
                };
            case "FORBIDDEN":
                return {
                    title: "Access Forbidden",
                    message: "You don't have permission to access this content."
                };
            case "NOT_FOUND":
                return {
                    title: "Not Found",
                    message: "The requested content could not be found."
                };
            case "INTERNAL_SERVER_ERROR":
                return {
                    title: "Server Error",
                    message: "Something went wrong on our end. Please try again later."
                };
            default:
                return {
                    title: "Error",
                    message: error.message || "An unexpected error occurred. Please try again."
                };
        }
    }
    
    // Handle generic errors
    return {
        title: "Something went wrong",
        message: error.message || "An error occurred while loading the content. Please try again."
    };
}

export default function ErrorPage({ 
    error, 
    onRetry, 
    title, 
    message 
}: ErrorPageProps) {
    const [isRetrying, setIsRetrying] = useState(false);

    if (!error) return null;

    // Get user-friendly error message
    const errorInfo = getErrorMessage(error);
    const displayTitle = title || errorInfo.title;
    const displayMessage = message || errorInfo.message;

    const handleRetry = async () => {
        if (onRetry) {
            setIsRetrying(true);
            try {
                await onRetry();
            } finally {
                setIsRetrying(false);
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
                <div className="mb-6">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                        <svg 
                            className="h-6 w-6 text-red-600" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                        >
                            <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                            />
                        </svg>
                    </div>
                </div>
                
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {displayTitle}
                </h3>
                
                <p className="text-sm text-gray-500 mb-6">
                    {displayMessage}
                </p>

                {error?.message && (
                    <div className="mb-6 p-3 bg-gray-100 rounded-md">
                        <p className="text-xs text-gray-600 font-mono break-all">
                            {error.message}
                        </p>
                    </div>
                )}

                {onRetry && (
                    <button
                        onClick={handleRetry}
                        disabled={isRetrying}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isRetrying ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Retrying...
                            </>
                        ) : (
                            'Try Again'
                        )}
                    </button>
                )}

                <div className="mt-4">
                    <button
                        onClick={() => window.location.reload()}
                        className="text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                        Refresh Page
                    </button>
                </div>
            </div>
        </div>
    );
}
