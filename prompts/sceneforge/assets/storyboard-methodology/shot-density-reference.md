# Shot Density Reference

asset_type: executable_reference
runtime_readable: true

```yaml
shot_density_reference:
  five_seconds:
    low: 2-3
    medium: 3-4
    high: 4-6
  eight_seconds:
    low: 3-4
    medium: 4-6
    high: 6-8
  ten_seconds:
    low: 4-5
    medium: 6-8
    high: 8-12
  twelve_seconds:
    low: 5-6
    medium: 7-9
    high: 9-12
  fifteen_seconds:
    low: 6-8
    medium: 8-12
    high: split_preferred
```

说明：

- `split_preferred` 表示不建议继续堆高镜头密度，而应优先拆分 unit。
- 镜头密度建议服务视频模型稳定性，不是艺术上限。
