// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

export function isPlaylistAccessImpactError(err) {
  const impact = err?.data
  return err?.status === 409 &&
    impact &&
    Array.isArray(impact.affectedPlaylists)
}

export function normalizePlaylistAccessImpact(impact) {
  return {
    affectedPlaylistCount: Number(impact?.affectedPlaylistCount || 0),
    affectedItemCount: Number(impact?.affectedItemCount || 0),
    affectedVideoCount: Number(impact?.affectedVideoCount || 0),
    affectedPlaylists: Array.isArray(impact?.affectedPlaylists)
      ? impact.affectedPlaylists.map(item => ({
          playlistId: item.playlistId,
          title: item.title || `Плейлист #${item.playlistId}`,
          filename: item.filename || '',
          accountId: item.accountId,
          accountName: item.accountName || `Лицевой счёт ${item.accountId}`,
          removedItemCount: Number(item.removedItemCount || 0),
          affectedVideoCount: Number(item.affectedVideoCount || 0)
        }))
      : []
  }
}
