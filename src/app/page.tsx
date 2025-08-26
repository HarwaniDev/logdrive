"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react"
import { api } from "~/trpc/react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import Header from "~/app/_components/Header";
import Link from "next/link";
import FoldersSection from "~/app/_components/FoldersSection";
import FilesSection from "~/app/_components/FilesSection";
import ErrorPage from "~/app/_components/ErrorPage";


//TODO: add breadcrumbs

interface FileItem {
    id: string;
    name: string;
    type: 'file' | 'folder';
    size?: string;
    createdAt: string;
    icon?: string;
    s3Key: string;
    owner: string;
    expiryDate?: string;
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
    const [openFileMenuId, setOpenFileMenuId] = useState<string | null>(null);
    const [hasExpiryDate, setHasExpiryDate] = useState(false);
    const [expiryDate, setExpiryDate] = useState('');
    const [showExpiryBanner, setShowExpiryBanner] = useState(true);

    // TODO:- add upload progress
    // const [uploadProgress, setUploadProgress] = useState(0);

    // tRPC queries and mutations
    const { data: rootFiles, refetch: refetchFiles, isLoading: isLoadingFiles, error: filesError, isError } = api.file.getContent.useQuery({
        folderId: folderId ? folderId : null
    })

    // expiry related queries
    const { data: expiredFiles } = api.file.getExpiredContent.useQuery();
    const { data: expiringSoonFiles } = api.file.getFilesExpiringWithinAMonth.useQuery();

    // Handle query errors
    useEffect(() => {
        if (isError) {
            console.error('Failed to fetch files:', filesError);
        }
    }, [isError])

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

    const deleteFileMutation = api.file.deleteFile.useMutation({
        onSuccess: () => {
            refetchFiles();
        },
        onError: (error) => {
            console.error("Failed to delete the file:", error);
            alert("Failed to delete the file");
        }
    })

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
            resetExpiryFields(); // Reset expiry fields on successful upload
        },
        onError: (error) => {
            console.error('Failed to confirm upload:', error);
            setIsUploading(false);
            alert('Failed to confirm upload. Please try again.');
        }
    });

    const getFileUrlMutation = api.file.getFileUrl.useMutation();

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
                folderName: newFolderName.trim(),
                parentId: folderId ? folderId : null
            });
        }
    };

    const handleFileSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedFile) {
            // Validate expiry date if checkbox is checked
            if (hasExpiryDate) {
                if (!expiryDate) {
                    alert('Please select an expiry date.');
                    return;
                }

                const selectedExpiryDate = new Date(expiryDate);
                const currentDate = new Date();
                currentDate.setHours(0, 0, 0, 0); // Reset time to start of day for comparison

                if (selectedExpiryDate < currentDate) {
                    alert('Expiry date cannot be in the past. Please select a future date.');
                    return;
                }
            }

            setIsUploading(true);
            // setUploadProgress(0);
            const something = selectedFile.size / (1024 * 1024);
            console.log(something);

            // Call tRPC to get upload URL
            uploadFileMutation.mutate({
                fileName: selectedFile.name,
                fileType: selectedFile.type || 'application/octet-stream',
                fileSize: (selectedFile.size / (1024 * 1024)),
                folderId: folderId,
                expiryDate: hasExpiryDate && expiryDate ? new Date(expiryDate) : undefined
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
            // Reset expiry fields when a new file is selected
            resetExpiryFields();
        }
    };

    const resetExpiryFields = () => {
        setHasExpiryDate(false);
        setExpiryDate('');
    };

    const handleDelete = (fileId: string) => {
        deleteFileMutation.mutate({
            fileId: fileId
        })
    }

    const handlePreviewFile = async (fileId: string) => {
        try {
            const { url } = await getFileUrlMutation.mutateAsync({ fileId, download: false });
            window.open(url, '_blank');
        } catch (err) {
            console.error('Failed to get preview URL:', err);
            alert('Failed to get preview URL.');
        } finally {
            setOpenFileMenuId(null);
        }
    };

    const handleDownloadFile = async (fileId: string) => {
        try {
            const { url } = await getFileUrlMutation.mutateAsync({ fileId, download: true });
            // Trigger download
            const link = document.createElement('a');
            link.href = url;
            link.download = '';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Failed to get download URL:', err);
            alert('Failed to get download URL.');
        } finally {
            setOpenFileMenuId(null);
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
    const folders: FolderItem[] = Array.isArray(rootFiles) ? rootFiles.filter(item => item.type === 'FOLDER').map(folder => ({
        id: folder.id,
        name: folder.name,
        itemCount: folder._count?.children,
        modified: folder.updatedAt.toLocaleDateString("en-IN")
    })) : [];

    const files: FileItem[] = Array.isArray(rootFiles) ? rootFiles.filter(item => item.type === 'FILE').map(file => ({
        id: file.id,
        name: file.name,
        type: "file",
        size: file.size ? `${(file.size).toFixed(2)} MB` : 'Unknown',
        createdAt: file.createdAt.toLocaleDateString("en-IN"),
        icon: getFileIcon(file.mimeType || ''),
        s3Key: file.s3Key!,
        owner: file.owner.name,
        expiryDate: file.expiryDate ? file.expiryDate.toLocaleDateString("en-IN") : undefined
    })) : [];

    const filteredFolders = folders.filter(folder =>
        folder.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredFiles = files.filter(file =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );



    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <Header
                onToggleNew={handleNewDropdownToggle}
                onCreateFolder={handleCreateFolder}
                onUploadFile={handleUploadFile}
                showNewDropdown={showNewDropdown}
                userName={session?.user?.name ?? null}
                onSignOut={() => signOut()}
            />

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" onClick={() => openFileMenuId && setOpenFileMenuId(null)}>
                {/* Search and Controls */}
                <div className="mb-8">
                    {/* Expiry Warning Banner */}
                    {!!((expiredFiles?.length || 0) + (expiringSoonFiles?.length || 0)) && showExpiryBanner && (
                        <div className="mb-4">
                            <div className="block w-full">
                                <div className="w-full border border-red-200 bg-red-50 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between cursor-pointer">
                                    <div onClick={() => {router.push("/expiry")}}>
                                        <span className="font-semibold">Warning:</span> You have {(expiringSoonFiles?.length || 0)} file(s) expiring within a month and {(expiredFiles?.length || 0)} file(s) already expired. Click to review.
                                    </div>
                                    <button className="cursor-pointer" onClick={() => {
                                        setShowExpiryBanner(false);
                                    }}>
                                        X
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
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

                    {/* Error State */}
                    {isError && (
                        <ErrorPage
                            error={filesError}
                            onRetry={refetchFiles}
                        />
                    )}

                    {/* Folders Section */}
                    {!isLoadingFiles && !isError && (
                        <FoldersSection viewMode={viewMode} folders={filteredFolders} />
                    )}

                    {/* Files Section */}
                    {!isLoadingFiles && !isError && (
                        <FilesSection
                            viewMode={viewMode}
                            files={filteredFiles}
                            openFileMenuId={openFileMenuId}
                            onToggleMenu={(fileId) => setOpenFileMenuId(openFileMenuId === fileId ? null : fileId)}
                            onPreview={(fileId) => handlePreviewFile(fileId)}
                            onDownload={(fileId) => handleDownloadFile(fileId)}
                            onDelete={(fileId) => handleDelete(fileId)}
                        />
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
                {!isError && !isLoadingFiles && !searchQuery && filteredFolders.length === 0 && filteredFiles.length === 0 && (
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
                                onClick={() => {
                                    setShowFileModal(false);
                                    resetExpiryFields();
                                }}
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

                                {/* Expiry Date Section */}
                                <div className="mb-4">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={hasExpiryDate}
                                            onChange={(e) => setHasExpiryDate(e.target.checked)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700">
                                            Has expiry date?
                                        </span>
                                    </label>

                                    {hasExpiryDate && (
                                        <div className="mt-3">
                                            <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-2">
                                                Expiry Date
                                            </label>
                                            <input
                                                type="date"
                                                id="expiryDate"
                                                value={expiryDate}
                                                onChange={(e) => setExpiryDate(e.target.value)}
                                                min={new Date().toISOString().split('T')[0]}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                                required={hasExpiryDate}
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Select a future date for document expiry
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowFileModal(false);
                                        resetExpiryFields();
                                    }}
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
