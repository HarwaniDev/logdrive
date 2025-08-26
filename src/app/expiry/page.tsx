"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "~/app/_components/Header";
import FilesSection from "~/app/_components/FilesSection";
import ErrorPage from "~/app/_components/ErrorPage";
import { api } from "~/trpc/react";

interface ExpiryFileItem {
    id: string;
    name: string;
    size?: string;
    createdAt: string;
    icon?: string;
    s3Key: string;
    owner: string;
    expiryDate?: string;
}

export default function ExpiryPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [openFileMenuId, setOpenFileMenuId] = useState<string | null>(null);

    const { data, refetch: refetchFiles, isLoading, isError, error } = api.file.getExpiredContent.useQuery();
    const { data: expiringSoonData, isLoading: isLoadingExpiringSoon, isError: isErrorExpiringSoon, error: errorExpiringSoon } = api.file.getFilesExpiringWithinAMonth.useQuery();
    const getFileUrlMutation = api.file.getFileUrl.useMutation();
    const deleteFileMutation = api.file.deleteFile.useMutation({
        onSuccess: () => {
            refetchFiles();
        },
        onError: (error) => {
            console.error("Failed to delete the file:", error);
            alert("Failed to delete the file");
        }
    })

    useEffect(() => {
        if (isError) {
            console.error('Failed to fetch expiry files:', error);
        }
        if (isErrorExpiringSoon) {
            console.error('Failed to fetch expiring-soon files:', errorExpiringSoon);
        }
    }, [isError, isErrorExpiringSoon]);

    const getFileIcon = (mimeType: string): string => {
        if (mimeType?.startsWith('image/')) return '🖼️';
        if (mimeType?.startsWith('video/')) return '🎥';
        if (mimeType?.startsWith('audio/')) return '🎵';
        if (mimeType?.includes('pdf')) return '📄';
        if (mimeType?.includes('word') || mimeType?.includes('document')) return '📝';
        if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return '📊';
        if (mimeType?.includes('powerpoint') || mimeType?.includes('presentation')) return '📈';
        if (mimeType?.includes('text/')) return '📄';
        return '📁';
    };

    const files: ExpiryFileItem[] = Array.isArray(data) ? data.map(file => ({
        id: file.id,
        name: file.name,
        size: file.size ? `${(file.size).toFixed(2)} MB` : 'Unknown',
        createdAt: file.createdAt.toLocaleDateString("en-IN"),
        icon: getFileIcon(file.mimeType || ''),
        s3Key: file.s3Key || '',
        owner: file.owner?.name ?? '',
        expiryDate: file.expiryDate ? file.expiryDate.toLocaleDateString("en-IN") : undefined,
    })) : [];

    const filteredFiles = files
        .filter(f => !!f.expiryDate)
        .filter(file => file.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const expiringSoonFiles: ExpiryFileItem[] = Array.isArray(expiringSoonData) ? expiringSoonData.map(file => ({
        id: file.id,
        name: file.name,
        size: file.size ? `${(file.size).toFixed(2)} MB` : 'Unknown',
        createdAt: file.createdAt.toLocaleDateString("en-IN"),
        icon: getFileIcon(file.mimeType || ''),
        s3Key: file.s3Key || '',
        owner: file.owner?.name ?? '',
        expiryDate: file.expiryDate ? file.expiryDate.toLocaleDateString("en-IN") : undefined,
    })) : [];

    const filteredExpiringSoonFiles = expiringSoonFiles
        .filter(f => !!f.expiryDate)
        .filter(file => file.name.toLowerCase().includes(searchQuery.toLowerCase()));

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

    if (status === "unauthenticated") {
        return null;
    }

    if (isError) {
        return <ErrorPage error={error} />;
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

    const handleDelete = (fileId: string) => {
        deleteFileMutation.mutate({
            fileId: fileId
        })
    }


    const handleToggleMenu = (fileId: string) => {
        setOpenFileMenuId(openFileMenuId === fileId ? null : fileId);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Header
                onToggleNew={() => { }}
                onCreateFolder={() => { }}
                onUploadFile={() => { }}
                showNewDropdown={false}
                userName={session?.user?.name}
            />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Expiry</h1>
                            <p className="mt-2 text-gray-600">Files that have an expiry date set</p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => router.push('/')}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                                title="Back to Root"
                            >
                                ← Back to Root
                            </button>
                            <div className="flex bg-white rounded-lg border border-gray-200 p-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${viewMode === 'grid'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    Grid
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${viewMode === 'list'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    List
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-6">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search files..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-400">🔍</span>
                        </div>
                    </div>
                </div>

                {isLoading || isLoadingExpiringSoon ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-4 text-gray-600">Loading files...</p>
                        </div>
                    </div>
                ) : filteredFiles.length === 0 && filteredExpiringSoonFiles.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">⏳</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {searchQuery ? 'No files found' : 'No files with expiry set'}
                        </h3>
                        <p className="text-gray-500">
                            {searchQuery ? 'Try adjusting your search terms' : 'Set an expiry date while uploading to see files here'}
                        </p>
                    </div>
                ) : (
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Expiring within a month</h2>
                        <FilesSection
                            viewMode={viewMode}
                            files={filteredExpiringSoonFiles}
                            openFileMenuId={openFileMenuId}
                            onToggleMenu={handleToggleMenu}
                            showExpiry={true}
                            onPreview={(fileId) => handlePreviewFile(fileId)}
                            onDownload={(fileId) => handleDownloadFile(fileId)}
                            onDelete={(fileId) => handleDelete(fileId)}
                        />

                        <div className="h-8" />

                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Expired files</h2>
                        <FilesSection
                            viewMode={viewMode}
                            files={filteredFiles}
                            openFileMenuId={openFileMenuId}
                            onToggleMenu={handleToggleMenu}
                            showExpiry={true}
                            onPreview={(fileId) => handlePreviewFile(fileId)}
                            onDownload={(fileId) => handleDownloadFile(fileId)}
                            onDelete={(fileId) => handleDelete(fileId)}
                        />
                    </div>
                )}
            </main>
        </div>
    );
}


