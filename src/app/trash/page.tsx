"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import Header from "~/app/_components/Header";
import FilesSection from "~/app/_components/FilesSection";
import ErrorPage from "~/app/_components/ErrorPage";
import toast, { Toaster } from "react-hot-toast";

interface TrashFileItem {
	id: string;
	name: string;
	size?: string;
	modified: string;
	icon?: string;
	s3Key: string;
	owner: string;
}

export default function TrashPage() {
	const { data: session, status } = useSession();
	const router = useRouter();

	// state management
	const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
	const [searchQuery, setSearchQuery] = useState('');
	const [openFileMenuId, setOpenFileMenuId] = useState<string | null>(null);

	// tRPC queries and mutations
	const { data: trashFiles, refetch: refetchTrashFiles, isLoading: isLoadingTrashFiles, error: trashError, isError } = api.file.getTrashContent.useQuery();

	const restoreFileMutation = api.file.restoreFile.useMutation({
		onMutate: () => {
			const id = toast.loading("Restoring file");
			return { toastId: id };
		},
		onSuccess: (_data, _variables, context) => {
			refetchTrashFiles(); // Refresh the trash list
			toast.success("File restored successfully", {
				id: context.toastId
			})
		},
		onError: (error, _variables, context) => {
			console.error("Failed to restore the file:", error);
			toast.error("Failed to restore the file", {
				id: context?.toastId
			});
		}
	});

	// Handle query errors
	useEffect(() => {
		if (isError) {
			console.error('Failed to fetch trash files:', trashError);
		}
	}, [isError]);

	// Helper function to get file icon based on MIME type
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

	// Process real data from backend
	const files: TrashFileItem[] = Array.isArray(trashFiles) ? trashFiles.map(file => ({
		id: file.id,
		name: file.name,
		size: file.size ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'Unknown',
		modified: file.updatedAt.toLocaleDateString(),
		icon: getFileIcon(file.mimeType || ''),
		s3Key: file.s3Key || '',
	})) : [];

	const filteredFiles = files.filter(file =>
		file.name.toLowerCase().includes(searchQuery.toLowerCase())
	);

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

	// Show error page if there's an error
	if (isError) {
		return <ErrorPage error={trashError} />;
	}

	const handleToggleMenu = (fileId: string) => {
		setOpenFileMenuId(openFileMenuId === fileId ? null : fileId);
	};

	const handleRestoreFile = (fileId: string) => {
		restoreFileMutation.mutate({ fileId });
		setOpenFileMenuId(null);
	};

	const handleSignOut = () => {
		// Handle sign out logic here
	};

	return (
		<div className="min-h-screen bg-gray-50">
			<Header
				onToggleNew={() => { }} // No new functionality in trash
				onCreateFolder={() => { }} // No folder creation in trash
				onUploadFile={() => { }} // No file upload in trash
				showNewDropdown={false}
				userName={session?.user?.name}
				onSignOut={handleSignOut}
			/>

			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Page Header */}
				<div className="mb-8">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-3xl font-bold text-gray-900">Trash</h1>
							<p className="mt-2 text-gray-600">Items that have been in Trash more than 30 days will be automatically deleted</p>
						</div>
						<div className="flex items-center space-x-4">
							{/* Back to Root Button */}
							<button
								onClick={() => router.push('/')}
								className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
								title="Back to Root"
							>
								← Back to Root
							</button>
							{/* View Mode Toggle */}
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

				{/* Search Bar */}
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

				{/* Content */}
				{isLoadingTrashFiles ? (
					<div className="flex items-center justify-center py-12">
						<div className="text-center">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
							<p className="mt-4 text-gray-600">Loading trash content...</p>
						</div>
					</div>
				) : filteredFiles.length === 0 ? (
					<div className="text-center py-12">
						<div className="text-6xl mb-4">🗑️</div>
						<h3 className="text-lg font-medium text-gray-900 mb-2">
							{searchQuery ? 'No files found' : 'No files in trash'}
						</h3>
						<p className="text-gray-500">
							{searchQuery ? 'Try adjusting your search terms' : 'Files you delete will appear here'}
						</p>
					</div>
				) : (
					<FilesSection
						viewMode={viewMode}
						files={filteredFiles}
						openFileMenuId={openFileMenuId}
						onToggleMenu={handleToggleMenu}
						onRestore={handleRestoreFile}
						isTrash={true}
					/>
				)}
			</main>
		</div>
	);
}
