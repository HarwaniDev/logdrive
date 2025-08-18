"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react"
import { api } from "~/trpc/react";
import { useSearchParams } from "next/navigation";
// import Link from "next/link";
import { useRouter } from "next/navigation";

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
    const router = useRouter();
    const searchParams = useSearchParams();
    const folderId = searchParams.get("folderId");

    // state management
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [showNewDropdown, setShowNewDropdown] = useState(false);
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [showFileModal, setShowFileModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    // TODO:- add upload progress
    // const [uploadProgress, setUploadProgress] = useState(0);


    const { data: rootFiles, refetch: refetchFiles, isLoading: isLoadingFiles } = api.file.getContent.useQuery({
        folderId: folderId ? folderId : null
    })
    // }
    // tRPC queries and mutations

    const createFolderMutation = api.file.addFolder.useMutation({
        onMutate: () => {
            setIsCreatingFolder(true);
        },
        onSuccess: () => {
            setNewFolderName('');
            setShowFolderModal(false);
            setIsCreatingFolder(false);
            refetchFiles(); // Refresh the file list
        },
        onError: (error) => {
            console.error('Failed to create folder:', error);
            setIsCreatingFolder(false);
            alert('Failed to create folder. Please try again.');
        }
    });

    const uploadFileMutation = api.file.addFile.useMutation({
        onSuccess: (data) => {
            // Handle the upload URL and upload the file to S3
            handleFileUpload(data.url, data.fileId);
        },
        onError: (error) => {
            console.error('Failed to prepare file upload:', error);
            setIsUploading(false);
            alert('Failed to prepare file upload. Please try again.');
        }
    });

    const confirmUploadMutation = api.file.confirmUpload.useMutation({
        onSuccess: () => {
            setIsUploading(false);
            // setUploadProgress(0);
            setSelectedFile(null);
            setShowFileModal(false);
            refetchFiles(); // Refresh the file list
        },
        onError: (error) => {
            console.error('Failed to confirm upload:', error);
            setIsUploading(false);
            alert('Failed to confirm upload. Please try again.');
        }
    });

    // Helper functions
    const handleNewDropdownToggle = () => {
        setShowNewDropdown(!showNewDropdown);
    };

    const handleCreateFolder = () => {
        setShowNewDropdown(false);
        setShowFolderModal(true);
    };

    const handleUploadFile = () => {
        setShowNewDropdown(false);
        setShowFileModal(true);
    };

    const handleFolderSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newFolderName.trim()) {
            createFolderMutation.mutate({
                folderName: newFolderName.trim()
            });
        }
    };

    const handleFileSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedFile) {
            setIsUploading(true);
            // setUploadProgress(0);

            // Call tRPC to get upload URL
            uploadFileMutation.mutate({
                fileName: selectedFile.name,
                fileType: selectedFile.type || 'application/octet-stream',
                fileSize: Number((selectedFile.size / (1024 * 1024)).toFixed(2)),
                folderId: folderId
            });
        }
    };

    const handleFileUpload = async (uploadUrl: string, fileId: string) => {
        if (!selectedFile) return;

        try {
            // Upload file to S3 using the presigned URL
            const response = await fetch(uploadUrl, {
                method: 'PUT',
                body: selectedFile,
                headers: {
                    'Content-Type': selectedFile.type || 'application/octet-stream',
                }
            });
            if (response && response.ok) {
                // Confirm successful upload
                confirmUploadMutation.mutate({
                    isUploaded: true,
                    fileId: fileId
                });
            } else {
                throw new Error('Upload failed');
            }
        } catch (error) {
            console.error('File upload failed:', error);
            // Confirm failed upload
            confirmUploadMutation.mutate({
                isUploaded: false,
                fileId: fileId
            });
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    // Helper function to get file icon based on MIME type
    const getFileIcon = (mimeType: string): string => {
        if (mimeType.startsWith('image/')) return '🖼️';
        if (mimeType.startsWith('video/')) return '🎥';
        if (mimeType.startsWith('audio/')) return '🎵';
        if (mimeType.includes('pdf')) return '📄';
        if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
        if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
        if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📈';
        if (mimeType.includes('text/')) return '📄';
        return '📁';
    };

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

    // Process real data from backend
    const folders: FolderItem[] = rootFiles?.filter(item => item.type === 'FOLDER').map(folder => ({
        id: folder.id,
        name: folder.name,
        itemCount: folder._count?.children,
        modified: folder.updatedAt.toLocaleDateString()
    })) || [];

    const files: FileItem[] = rootFiles?.filter(item => item.type === 'FILE').map(file => ({
        id: file.id,
        name: file.name,
        type: 'file',
        size: file.size ? `${file.size} MB` : 'Unknown',
        modified: file.updatedAt.toLocaleDateString(),
        icon: getFileIcon(file.mimeType || '')
    })) || [];

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
                        <div className="flex items-center space-x-8">
                            <div className="relative">
                                <button
                                    onClick={handleNewDropdownToggle}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                                >
                                    <span className="text-xl">+</span>
                                    <span>New</span>
                                </button>

                                {/* Dropdown Menu */}
                                {showNewDropdown && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                                        <div className="py-1">
                                            <button
                                                onClick={handleCreateFolder}
                                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                            >
                                                <span className="mr-2">📁</span>
                                                New Folder
                                            </button>
                                            <button
                                                onClick={handleUploadFile}
                                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                            >
                                                <span className="mr-2">📄</span>
                                                Upload File
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {session?.user && (
                                <div className="flex items-center space-x-3">
                                    <span className="text-sm text-gray-700">
                                        Welcome, {session.user.name}
                                    </span>
                                    <button
                                        onClick={() => signOut()}
                                        className="text-gray-600 text-sm hover:text-gray-800 px-3 py-2 cursor-pointer rounded-md hover:bg-gray-100 transition-colors"
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
                            <button
                                onClick={() => refetchFiles()}
                                disabled={isLoadingFiles}
                                className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Refresh files"
                            >
                                🔄
                            </button>
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
                        <li>/</li>
                        <li className="hover:text-gray-700 cursor-pointer">Root</li>
                    </ol>
                </nav>

                {/* Content Grid */}
                <div className="space-y-8">
                    {/* Loading State */}
                    {isLoadingFiles && (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-4 text-gray-600">Loading files and folders...</p>
                        </div>
                    )}

                    {/* Folders Section */}
                    {!isLoadingFiles && (
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Folders</h2>
                            {viewMode === 'grid' ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {filteredFolders.map((folder) => (
                                        <div
                                            key={folder.id}
                                            className="group bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer" onClick={() => {
                                                router.push(`?folderId=${folder.id}`)
                                            }}
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
                    )}

                    {/* Files Section */}
                    {!isLoadingFiles && (
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
                    )}
                </div>

                {/* Empty State */}
                {!isLoadingFiles && filteredFolders.length === 0 && filteredFiles.length === 0 && searchQuery && (
                    <div className="text-center py-12">
                        <span className="text-4xl">📄</span>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No results found</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Try adjusting your search terms or browse all files.
                        </p>
                    </div>
                )}

                {/* No Files State */}
                {!isLoadingFiles && !searchQuery && filteredFolders.length === 0 && filteredFiles.length === 0 && (
                    <div className="text-center py-12">
                        <span className="text-4xl">📁</span>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No files or folders yet</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Get started by creating a folder or uploading a file.
                        </p>
                    </div>
                )}
            </main>

            {/* Folder Creation Modal */}
            {showFolderModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Create New Folder</h3>
                            <button
                                onClick={() => setShowFolderModal(false)}
                                className="text-gray-400 hover:text-gray-600 text-xl"
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleFolderSubmit}>
                            <div className="mb-4">
                                <label htmlFor="folderName" className="block text-sm font-medium text-gray-700 mb-2">
                                    Folder Name
                                </label>
                                <input
                                    type="text"
                                    id="folderName"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter folder name"
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowFolderModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreatingFolder}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isCreatingFolder ? (
                                        <div className="flex items-center space-x-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            <span>Creating...</span>
                                        </div>
                                    ) : (
                                        'Create Folder'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* File Upload Modal */}
            {showFileModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Upload File</h3>
                            <button
                                onClick={() => setShowFileModal(false)}
                                className="text-gray-400 hover:text-gray-600 text-xl"
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleFileSubmit}>
                            <div className="mb-4">
                                <label htmlFor="fileUpload" className="block text-sm font-medium text-gray-700 mb-2">
                                    Select File
                                </label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                                    <input
                                        type="file"
                                        id="fileUpload"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                    <label htmlFor="fileUpload" className="cursor-pointer">
                                        <span className="text-4xl block mb-2">📁</span>
                                        <p className="text-sm text-gray-600">
                                            {selectedFile ? selectedFile.name : "Click to select a file"}
                                        </p>
                                        {selectedFile && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                                            </p>
                                        )}
                                    </label>
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowFileModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!selectedFile || isUploading}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isUploading ? (
                                        <div className="flex items-center space-x-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            <span>Uploading...</span>
                                        </div>
                                    ) : (
                                        'Upload File'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
