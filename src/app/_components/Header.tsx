"use client";

import React from "react";

interface HeaderProps {
	onToggleNew: () => void;
	onCreateFolder: () => void;
	onUploadFile: () => void;
	showNewDropdown: boolean;
	userName?: string | null;
	onSignOut?: () => void;
}

export default function Header({
	onToggleNew,
	onCreateFolder,
	onUploadFile,
	showNewDropdown,
	userName,
	onSignOut,
}: HeaderProps) {
	return (
		<header className="bg-white shadow-sm border-b border-gray-200">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between items-center h-16">
					<div className="flex items-center">
						<h1 className="text-2xl font-bold text-gray-900">LogDrive</h1>
					</div>
					<div className="flex items-center space-x-8">
						<div className="relative">
							<button
								onClick={onToggleNew}
								className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
							>
								<span className="text-xl">+</span>
								<span>New</span>
							</button>

							{showNewDropdown && (
								<div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
									<div className="py-1">
										<button
											onClick={onCreateFolder}
											className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
										>
											<span className="mr-2">📁</span>
											New Folder
										</button>
										<button
											onClick={onUploadFile}
											className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
										>
											<span className="mr-2">📄</span>
											Upload File
										</button>
									</div>
								</div>
							)}
						</div>
						{userName && (
							<div className="flex items-center space-x-3">
								<span className="text-sm text-gray-700">Welcome, {userName}</span>
								<button
									onClick={onSignOut}
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
	);
}


