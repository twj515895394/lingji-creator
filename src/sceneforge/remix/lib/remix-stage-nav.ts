export type RemixNavScope = 'asset-processing' | 'creation';

export interface RemixStageNavItem {
  id: string;
  index: number;
  title: string;
  caption: string;
}

export const REMIX_ASSET_PROCESSING_NAV_ITEMS: RemixStageNavItem[] = [
  { id: 'source-import', index: 1, title: '导入原片', caption: '登记源素材与基础信息' },
  { id: 'segmentation', index: 2, title: '真实镜头切片', caption: '保护镜头与表演完整性' },
  { id: 'keyframes', index: 3, title: '关键帧提取', caption: '首帧 / 尾帧 / 中间帧' },
  { id: 'understanding', index: 4, title: '原片理解', caption: '剧情、动作、镜头与梗点' },
  { id: 'annotate', index: 5, title: '人工标注', caption: '保留点、替换点与备注' },
  { id: 'publish-source', index: 6, title: '保存入库', caption: '让素材进入可复用资产库' },
] as const;

export const REMIX_CREATION_NAV_ITEMS: RemixStageNavItem[] = [
  { id: 'select-asset', index: 1, title: '选择资产', caption: '引用已入库的源素材' },
  { id: 'create-variant', index: 2, title: '创建二创版本', caption: '概念、强度与保留矩阵' },
  { id: 'strategy', index: 3, title: '改编策略', caption: '保留点、替换点与风险备注' },
  { id: 'design', index: 4, title: '画面设计', caption: '角色、场景、风格与连续性' },
  { id: 'keyframe-prompts', index: 5, title: '关键帧改图提示词', caption: '逐帧提示词与全局规则' },
  { id: 'edited-keyframes', index: 6, title: '改后关键帧验收', caption: '状态与质量检查' },
  { id: 'seedance-prompts', index: 7, title: 'Seedance 2.0 视频提示词', caption: '画面、动作、镜头与声音' },
  { id: 'publish-bundle', index: 8, title: '发布清单', caption: '提示词包与交付顺序' },
] as const;

export function getRemixStageNavItems(scope: RemixNavScope): RemixStageNavItem[] {
  return scope === 'asset-processing'
    ? REMIX_ASSET_PROCESSING_NAV_ITEMS
    : REMIX_CREATION_NAV_ITEMS;
}
