#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将 markdown 文件中的 mermaid 代码块转换为图片
"""
import re
import subprocess
import os
import tempfile
import shutil

def convert_mermaid_to_images(md_file, output_dir='pics/mermaid'):
    """将 markdown 中的 mermaid 代码块转换为图片"""

    # 读取 markdown 文件
    with open(md_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # 创建输出目录
    os.makedirs(output_dir, exist_ok=True)

    # 匹配 mermaid 代码块
    pattern = r'```mermaid\n(.*?)\n```'
    matches = list(re.finditer(pattern, content, re.DOTALL))

    print(f"找到 {len(matches)} 个 mermaid 图")

    # 替换内容
    new_content = content
    replacements = []

    for i, match in enumerate(matches, 1):
        mermaid_code = match.group(1).strip()

        # 生成图片文件名
        img_filename = f'mermaid_diagram_{i:02d}.png'
        img_path = os.path.join(output_dir, img_filename)
        relative_path = f'pics/mermaid/{img_filename}'

        # 创建临时 mermaid 文件
        with tempfile.NamedTemporaryFile(mode='w', suffix='.mmd', delete=False) as tmp_file:
            tmp_file.write(mermaid_code)
            tmp_mmd = tmp_file.name

        try:
            # 使用 mmdc 转换为 PNG（300 DPI 效果）
            # 通过缩放因子和尺寸实现高分辨率
            # -s 3: 缩放因子 3，相当于约 300 DPI 的效果
            # -w 2400: 宽度 2400px
            # -H 1600: 高度 1600px（自动调整，实际高度由内容决定）
            print(f"正在转换第 {i} 个图: {img_filename} (300 DPI)")
            result = subprocess.run(
                ['mmdc', '-i', tmp_mmd, '-o', img_path,
                 '-w', '2400',           # 宽度 2400px
                 '-H', '1600',           # 高度 1600px
                 '-s', '3',              # 缩放因子 3（实现 300 DPI 效果）
                 '-b', 'white',          # 白色背景
                 '-t', 'default'],       # 默认主题
                capture_output=True,
                text=True,
                timeout=60
            )

            if result.returncode == 0:
                # 替换为图片引用
                # 尝试提取图标题（如果有的话）
                title_match = re.search(r'^图\d+\s+(.+?)$', match.group(0), re.MULTILINE)
                if title_match:
                    title = title_match.group(1)
                else:
                    title = f"图{i}"

                img_markdown = f'\n![{title}]({relative_path})\n'
                replacements.append((match.start(), match.end(), img_markdown))
                print(f"  ✓ 成功转换: {img_path}")
            else:
                print(f"  ✗ 转换失败: {result.stderr}")

        except subprocess.TimeoutExpired:
            print(f"  ✗ 转换超时: {img_filename}")
        except Exception as e:
            print(f"  ✗ 转换出错: {e}")
        finally:
            # 清理临时文件
            if os.path.exists(tmp_mmd):
                os.unlink(tmp_mmd)

    # 从后往前替换，避免索引偏移
    for start, end, replacement in reversed(replacements):
        new_content = new_content[:start] + replacement + new_content[end:]

    return new_content

if __name__ == '__main__':
    md_file = '《数据库系统概论》课程设计报告.md'
    output_file = '《数据库系统概论》课程设计报告_with_images.md'

    print(f"开始处理: {md_file}")
    new_content = convert_mermaid_to_images(md_file)

    # 保存新文件
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"\n完成！已生成: {output_file}")
    print("现在可以使用 pandoc 转换新文件了")
