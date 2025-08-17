"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react"
interface FileItem {
    id: string;
    name: string;
    type: 'file' | 'folder';
    size?: string;
    modified: string;
    icon?: string;
}

interface FolderItem {
    id: string;
    name: string;
    itemCount: number;
    modified: string;
}

export default function Home() {
    const { data: session, status } = useSession();

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');

    // Show loading state while checking authentication
    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    // Redirect to sign-in if not authenticated
    if (status === "unauthenticated") {
        return null; // Middleware will handle redirect
    }

    // Mock data - replace with actual data from your backend
    const folders: FolderItem[] = [
        { id: '1', name: 'Documents', itemCount: 12, modified: '2024-01-15' },
        { id: '2', name: 'Photos', itemCount: 156, modified: '2024-01-14' },
        { id: '3', name: 'Work', itemCount: 8, modified: '2024-01-13' },
        { id: '4', name: 'Personal', itemCount: 23, modified: '2024-01-12' },
        { id: '5', name: 'Projects', itemCount: 5, modified: '2024-01-11' },
        { id: '6', name: 'Backup', itemCount: 89, modified: '2024-01-10' },
    ];

    const files: FileItem[] = [
        { id: '1', name: 'Project Proposal.pdf', type: 'file', size: '2.4 MB', modified: '2024-01-15', icon: '📄' },
        { id: '2', name: 'Meeting Notes.docx', type: 'file', size: '156 KB', modified: '2024-01-14', icon: '📝' },
        { id: '3', name: 'Budget Spreadsheet.xlsx', type: 'file', size: '1.2 MB', modified: '2024-01-13', icon: '📊' },
        { id: '4', name: 'Presentation.pptx', type: 'file', size: '8.7 MB', modified: '2024-01-12', icon: '📈' },
        { id: '5', name: 'Image.jpg', type: 'file', size: '3.1 MB', modified: '2024-01-11', icon: '🖼️' },
    ];

    const filteredFolders = folders.filter(folder =>
        folder.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredFiles = files.filter(file =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <h1 className="text-2xl font-bold text-gray-900">LogDrive</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
                                <span className="text-xl">+</span>
                                <span>New</span>
                            </button>
                            {session?.user && (
                                <div className="flex items-center space-x-3">
                                    <span className="text-sm text-gray-700">
                                        Welcome, {session.user.email}
                                    </span>
                                    <button
                                        onClick={() => signOut()}
                                        className="text-gray-600 hover:text-gray-800 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
                                    >
                                        Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Search and Controls */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                        {/* Search Bar */}
                        <div className="relative flex-1 max-w-lg">
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                🔍
                            </div>
                            <input
                                type="text"
                                placeholder="Search files and folders..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* View Controls */}
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center bg-white border border-gray-300 rounded-lg p-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-md ${viewMode === 'grid'
                                            ? 'bg-blue-100 text-blue-600'
                                            : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    ⬜
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-md ${viewMode === 'list'
                                            ? 'bg-blue-100 text-blue-600'
                                            : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    ☰
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Breadcrumb */}
                <nav className="mb-6">
                    <ol className="flex items-center space-x-2 text-sm text-gray-500">
                        <li className="hover:text-gray-700 cursor-pointer">Home</li>
                        <li>/</li>
                        <li className="text-gray-900">My Drive</li>
                    </ol>
                </nav>

                {/* Content Grid */}
                <div className="space-y-8">
                    {/* Folders Section */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Folders</h2>
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {filteredFolders.map((folder) => (
                                    <div
                                        key={folder.id}
                                        className="group bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                                    >
                                        <div className="flex flex-col items-center text-center">
                                            <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
                                                <span className="text-2xl">📁</span>
                                            </div>
                                            <h3 className="font-medium text-gray-900 text-sm truncate w-full">
                                                {folder.name}
                                            </h3>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {folder.itemCount} items
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                                    <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500">
                                        <div className="col-span-6">Name</div>
                                        <div className="col-span-2">Items</div>
                                        <div className="col-span-4">Modified</div>
                                    </div>
                                </div>
                                {filteredFolders.map((folder) => (
                                    <div
                                        key={folder.id}
                                        className="px-6 py-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                                    >
                                        <div className="grid grid-cols-12 gap-4 items-center">
                                            <div className="col-span-6 flex items-center space-x-3">
                                                <span className="text-xl">📁</span>
                                                <span className="font-medium text-gray-900">{folder.name}</span>
                                            </div>
                                            <div className="col-span-2 text-sm text-gray-500">{folder.itemCount} items</div>
                                            <div className="col-span-4 text-sm text-gray-500">{folder.modified}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Files Section */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Files</h2>
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {filteredFiles.map((file) => (
                                    <div
                                        key={file.id}
                                        className="group bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                                    >
                                        <div className="flex flex-col items-center text-center">
                                            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-gray-200 transition-colors">
                                                <span className="text-2xl">{file.icon}</span>
                                            </div>
                                            <h3 className="font-medium text-gray-900 text-sm truncate w-full">
                                                {file.name}
                                            </h3>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {file.size}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                                    <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500">
                                        <div className="col-span-6">Name</div>
                                        <div className="col-span-2">Size</div>
                                        <div className="col-span-4">Modified</div>
                                    </div>
                                </div>
                                {filteredFiles.map((file) => (
                                    <div
                                        key={file.id}
                                        className="px-6 py-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                                    >
                                        <div className="grid grid-cols-12 gap-4 items-center">
                                            <div className="col-span-6 flex items-center space-x-3">
                                                <span className="text-xl">{file.icon}</span>
                                                <span className="font-medium text-gray-900">{file.name}</span>
                                            </div>
                                            <div className="col-span-2 text-sm text-gray-500">{file.size}</div>
                                            <div className="col-span-4 text-sm text-gray-500">{file.modified}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                {/* Empty State */}
                {filteredFolders.length === 0 && filteredFiles.length === 0 && searchQuery && (
                    <div className="text-center py-12">
                        <span className="text-4xl">📄</span>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No results found</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Try adjusting your search terms or browse all files.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}
