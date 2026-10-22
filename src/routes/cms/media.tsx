import React, { useState, useRef } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Video,
  UploadSimple,
  Trash,
  Copy,
  MagnifyingGlass,
} from '@phosphor-icons/react';

import { mediaApi, type MediaItem } from '@/lib/api/squishy/mediaApi';
import { Button } from '@/components/ui/button';
import { Mascot } from '@/components/shop/mascot';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader, LoadingState } from '@/components/shop/page-header';
import { cn, getFileUrl } from '@/lib/utils';

const isVideoItem = (item: MediaItem) => Boolean(item.durationSeconds || item.url.match(/\.(mp4|webm|mov|mkv)$/i));

export const Route = createFileRoute('/cms/media')({
  component: MediaLibraryScreen,
});

function MediaLibraryScreen() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'ALL' | 'IMAGE' | 'VIDEO'>('ALL');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Modals preview
  const [previewMedia, setPreviewMedia] = useState<MediaItem | null>(null);
  const [deletingMedia, setDeletingMedia] = useState<MediaItem | null>(null);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const { data: mediaRes, isLoading } = useQuery({
    queryKey: ['mediaLibrary', activeTab, selectedEntityType],
    queryFn: () => mediaApi.getAll(
      selectedEntityType === 'ALL' ? undefined : selectedEntityType,
      activeTab === 'ALL' ? undefined : activeTab
    ),
  });
  const mediaItems = mediaRes?.data || [];

  const deleteMutation = useMutation({
    mutationFn: ({ id, isVideo }: { id: string; isVideo: boolean }) => mediaApi.deleteMedia(id, isVideo),
    onSuccess: () => {
      toast.success('Đã xóa tệp media thành công!');
      setDeletingMedia(null);
      setPreviewMedia(null);
      queryClient.invalidateQueries({ queryKey: ['mediaLibrary'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Không xóa được tệp.');
    }
  });

  const handleUploadImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of files) {
        await mediaApi.uploadImage(file, selectedEntityType === 'ALL' ? 'PRODUCT' : selectedEntityType);
      }
      toast.success(`Đã tải lên ${files.length} ảnh thành công!`);
      queryClient.invalidateQueries({ queryKey: ['mediaLibrary'] });
    } catch {
      toast.error('Lỗi khi tải ảnh.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsUploading(true);
    try {
      await mediaApi.uploadVideo(file, selectedEntityType === 'ALL' ? 'PRODUCT' : selectedEntityType);
      toast.success('Đã tải lên video thành công!');
      queryClient.invalidateQueries({ queryKey: ['mediaLibrary'] });
    } catch {
      toast.error('Lỗi khi tải video.');
    } finally {
      setIsUploading(false);
    }
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(getFileUrl(url));
      toast.success('Đã sao chép đường dẫn file!');
    } catch {
      toast.error('Không sao chép được đường dẫn.');
    }
  };

  const filteredMedia = mediaItems.filter(item => {
    if (!searchKeyword.trim()) return true;
    const kw = searchKeyword.toLowerCase();
    return (item.fileName && item.fileName.toLowerCase().includes(kw)) || item.entityType.toLowerCase().includes(kw);
  });

  return (
    <div className="space-y-4 sm:space-y-5 w-full max-w-[1650px] mx-auto font-sans">
      <PageHeader
        emoji="🎬"
        title="Thư viện ảnh & video"
        description="Quản lý tập trung hình ảnh sản phẩm, video bóp slow-rising và ảnh chuyển khoản."
        actions={
          <div className="grid grid-cols-2 gap-2 w-full md:w-auto">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="doodle-btn bg-[#FEF08A] hover:bg-[#FDE047] text-black px-3 sm:px-4 py-2.5 text-sm sm:text-sm flex items-center justify-center gap-1.5"
            >
              <UploadSimple className="w-4 h-4" weight="bold" /> {isUploading ? 'Đang tải...' : 'Tải ảnh'}
            </button>
            <button
              onClick={() => videoInputRef.current?.click()}
              disabled={isUploading}
              className="doodle-btn bg-white hover:bg-slate-50 text-black px-3 sm:px-4 py-2.5 text-sm sm:text-sm flex items-center justify-center gap-1.5"
            >
              <Video className="w-4 h-4 text-purple-600" weight="bold" /> Tải video
            </button>
            <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleUploadImages} className="hidden" />
            <input ref={videoInputRef} type="file" accept="video/*" onChange={handleUploadVideo} className="hidden" />
          </div>
        }
      />

      {/* Bộ Lọc & Tìm Kiếm */}
      <div className="doodle-card p-3 sm:p-4 flex flex-col lg:flex-row lg:items-center gap-2.5 sm:gap-3">
        <div className="relative flex-1 w-full">
          <MagnifyingGlass className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black" weight="bold" />
          <Input
            type="search"
            placeholder="Tìm theo tên tệp hoặc phân loại..."
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            className="doodle-input pl-9 h-10 text-base sm:text-sm font-medium"
          />
        </div>

        {/* Tab Media Type */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 w-full lg:w-auto">
        <div className="flex items-center gap-1 bg-[#FAF7EE] border-2 border-black p-1 rounded-xl w-full sm:w-auto shadow-[1.5px_1.5px_0px_#000]">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'IMAGE', label: 'Chỉ Ảnh' },
            { id: 'VIDEO', label: 'Chỉ Video' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                activeTab === t.id
                  ? 'bg-[#FEF08A] text-black border-1.5 border-black shadow-[1px_1px_0px_#000]'
                  : 'text-slate-700 hover:text-black'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filter EntityType */}
        <select
          value={selectedEntityType}
          onChange={e => setSelectedEntityType(e.target.value)}
          className="h-10 text-base sm:text-sm w-full sm:w-auto"
        >
          <option value="ALL">-- Tất cả mục đích --</option>
          <option value="PRODUCT">Sản phẩm Squishy</option>
          <option value="ORDER_PAYMENT">Hóa đơn & Chuyển khoản</option>
          <option value="GOODS_RECEIPT">Phiếu nhập kho</option>
          <option value="RETURN_REQUEST">Đổi trả & Bảo hành</option>
        </select>
        </div>
      </div>

      {/* Lưới Hiển Thị Tệp Media */}
      {isLoading ? (
        <LoadingState text="Đang tải thư viện media..." />
      ) : filteredMedia.length === 0 ? (
        <div className="py-14 px-4 text-center flex flex-col items-center justify-center gap-2 doodle-card">
          <Mascot mood="sleepy" size={80} color="#DDD6FE" />
          <p className="text-base font-black text-black">Chưa có tệp hình ảnh hoặc video nào.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 min-[480px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {filteredMedia.map(item => {
            const isVid = isVideoItem(item);

            return (
              <div
                key={item.id}
                className="doodle-card overflow-hidden doodle-card-hover group flex flex-col justify-between"
              >
                {/* Media Preview Box */}
                <button
                  type="button"
                  onClick={() => setPreviewMedia(item)}
                  className="w-full aspect-square bg-slate-900 relative cursor-pointer overflow-hidden flex items-center justify-center"
                >
                  {isVid ? (
                    <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
                      <video src={getFileUrl(item.url)} preload="metadata" muted playsInline className="w-full h-full object-cover opacity-80" />
                      <div className="absolute w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white shadow-lg">
                        <Video className="w-5 h-5 text-purple-400" />
                      </div>
                      <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                        VIDEO
                      </span>
                    </div>
                  ) : (
                    <img
                      src={getFileUrl(item.url)}
                      alt={item.fileName || 'Ảnh'}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}

                  {/* Badge Entity Type */}
                  <span className={`absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-md ${
                    item.entityType === 'PRODUCT'
                      ? 'bg-rose-500/90 text-white'
                      : item.entityType === 'ORDER_PAYMENT'
                        ? 'bg-emerald-500/90 text-white'
                        : 'bg-blue-500/90 text-white'
                  }`}>
                    {item.entityType === 'PRODUCT' ? 'Sản phẩm' : item.entityType === 'ORDER_PAYMENT' ? 'Thanh toán' : item.entityType === 'RETURN_REQUEST' ? 'Đổi trả' : item.entityType}
                  </span>
                </button>

                {/* Info & Action Bar */}
                <div className="p-2 space-y-1 bg-background">
                  <p className="text-[11px] font-semibold truncate text-foreground" title={item.fileName || item.url}>
                    {item.fileName || 'media-item'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t">
                    <button
                      onClick={() => copyUrl(item.url)}
                      className="text-xs text-muted-foreground hover:text-rose-600 flex items-center gap-1 py-1"
                      title="Sao chép liên kết URL"
                    >
                      <Copy className="w-3.5 h-3.5" /> Link
                    </button>

                    <button
                      onClick={() => setDeletingMedia(item)}
                      aria-label="Xóa tệp"
                      className="text-muted-foreground hover:text-rose-500 p-1.5"
                      title="Xóa tệp"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* POPUP XEM TO ẢNH / PHÁT VIDEO */}
      <Dialog open={!!previewMedia} onOpenChange={() => setPreviewMedia(null)}>
        <DialogContent className="sm:max-w-2xl p-2 bg-background">
          <DialogHeader className="p-3 pb-0">
            <DialogTitle className="truncate pr-8">
              {previewMedia?.fileName || 'Chi Tiết Tệp Media'}
            </DialogTitle>
          </DialogHeader>

          {previewMedia && (
            <div className="p-2 space-y-3">
              <div className="rounded-xl overflow-hidden bg-black flex items-center justify-center">
                {isVideoItem(previewMedia) ? (
                  <video src={getFileUrl(previewMedia.url)} controls autoPlay playsInline className="max-h-[65dvh] w-full" />
                ) : (
                  <img src={getFileUrl(previewMedia.url)} alt="Xem trước" className="max-h-[65dvh] w-auto max-w-full object-contain" />
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 px-2 text-xs">
                <span className="text-muted-foreground">
                  Phân loại: <strong className="text-foreground">{previewMedia.entityType}</strong>
                  {' • '}{new Date(previewMedia.createdAt).toLocaleDateString('vi-VN')}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyUrl(previewMedia.url)} className="rounded-lg text-xs">
                    <Copy className="w-3.5 h-3.5 mr-1" /> Sao chép URL
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDeletingMedia(previewMedia)} className={cn('rounded-lg text-xs text-rose-600 hover:bg-rose-50')}>
                    <Trash className="w-3.5 h-3.5 mr-1" /> Xóa
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deletingMedia}
        onOpenChange={open => !open && setDeletingMedia(null)}
        title="Xóa tệp media"
        description={`Xóa "${deletingMedia?.fileName || 'tệp này'}"? Sản phẩm/đơn hàng đang dùng tệp này sẽ không hiển thị được nữa.`}
        isLoading={deleteMutation.isPending}
        onConfirm={() => deletingMedia && deleteMutation.mutate({ id: deletingMedia.id, isVideo: isVideoItem(deletingMedia) })}
      />
    </div>
  );
}
