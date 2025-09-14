"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
	const { data: session } = useSession();
	const pathname = usePathname();
	const [showUserMenu, setShowUserMenu] = useState(false);
	const userMenuRef = useRef<HTMLDivElement>(null);
	const newDropdownRef = useRef<HTMLDivElement>(null);

	const isActive = (path: string) => pathname === path;

	// Close user menu when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
				setShowUserMenu(false);
			}
			if (showNewDropdown && newDropdownRef.current && !newDropdownRef.current.contains(event.target as Node)) {
				onToggleNew();
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [onToggleNew, showNewDropdown]);

	return (
		<header className="bg-white shadow-sm border-b border-gray-200">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between items-center h-16">
					<div className="flex items-center space-x-8">
						<Link href="/" className="text-2xl font-bold text-gray-900 hover:text-gray-700 transition-colors">
							LogDrive
						</Link>
						
						{/* Navigation Links */}
						<nav className="hidden md:flex items-center space-x-6">
							<Link
								href="/"
								className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
									isActive("/") 
										? "bg-blue-100 text-blue-700" 
										: "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
								}`}
							>
								Files
							</Link>
							<Link
								href="/expiry"
								className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
									isActive("/expiry") 
										? "bg-blue-100 text-blue-700" 
										: "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
								}`}
							>
								Expiry
							</Link>
							<Link
								href="/trash"
								className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
									isActive("/trash") 
										? "bg-blue-100 text-blue-700" 
										: "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
								}`}
							>
								Trash
							</Link>
							{session?.user?.role === "admin" && (
								<Link
									href="/admin/activity"
									className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
										isActive("/admin/activity") 
											? "bg-blue-100 text-blue-700" 
											: "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
									}`}
								>
									Activity Logs
								</Link>
							)}
						</nav>
					</div>

					<div className="flex items-center space-x-4">
						{/* New Button - Only show when not in trash or activity logs */}
						{!isActive("/trash") && !isActive("/admin/activity") && !isActive("/expiry") && (
							<div className="relative" ref={newDropdownRef}>
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
						)}

						{/* User Menu */}
						{userName && (
							<div className="relative" ref={userMenuRef}>
								<button
									onClick={() => setShowUserMenu(!showUserMenu)}
									className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
								>
									<div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
										<span className="text-sm font-medium text-blue-700">
											{userName.charAt(0).toUpperCase()}
										</span>
									</div>
									<span className="hidden sm:block text-sm font-medium">{userName}</span>
									{session?.user?.role === "admin" && (
										<span className="hidden sm:block text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
											Admin
										</span>
									)}
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
									</svg>
								</button>

								{showUserMenu && (
									<div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
										<div className="py-1">
											<div className="px-4 py-2 text-sm text-gray-500 border-b border-gray-100">
												{session?.user?.email}
											</div>
											{session?.user?.role === "admin" && (
												<Link
													href="/admin/activity"
													className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
													onClick={() => setShowUserMenu(false)}
												>
													<span className="mr-2">📊</span>
													Activity Logs
												</Link>
											)}
											<Link
												href="/expiry"
												className="md:hidden flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
												onClick={() => setShowUserMenu(false)}
											>
												<span className="mr-2">⏳</span>
												Expiry
											</Link>
											<Link
												href="/trash"
												className="md:hidden flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
												onClick={() => setShowUserMenu(false)}
											>
												<span className="mr-2">🗑️</span>
												Trash
											</Link>
											<button
												onClick={() => {
													onSignOut?.();
													setShowUserMenu(false);
												}}
												className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
											>
												<span className="mr-2">🚪</span>
												Sign Out
											</button>
										</div>
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		</header>
	);
}


