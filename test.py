from PIL import Image
import os

# 设置要压缩的根目录路径
root_folder_path = './'  # 请替换为实际的根文件夹路径
MIN_SIZE_MB = 1  # 设置最小压缩阈值为2MB

# 遍历目录及其子文件夹
for folder_path, subfolders, filenames in os.walk(root_folder_path):
    for filename in filenames:
        # 获取文件的完整路径
        file_path = os.path.join(folder_path, filename)
        
        # 只处理图片文件（可以根据需要扩展更多格式）
        if filename.lower().endswith(('png', 'jpg', 'jpeg', 'gif', 'bmp')):
            # 获取文件大小（MB）
            file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
            
            # 只处理大于2MB的文件
            if file_size_mb > MIN_SIZE_MB:
                try:
                    # 打开图片
                    with Image.open(file_path) as img:
                        # 获取原始尺寸
                        original_width, original_height = img.size
                        # 计算压缩后的尺寸
                        new_width = int(original_width * 0.3)
                        new_height = int(original_height * 0.3)

                        # 压缩图片
                        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

                        # 保存压缩后的图片，覆盖原文件
                        img.save(file_path, quality=90)  # 调整质量参数，可以控制压缩率

                    print(f"Image {filename} ({file_size_mb:.2f}MB) in {folder_path} compressed successfully.")
                except Exception as e:
                    print(f"Error processing {filename} in {folder_path}: {e}")
            else:
                print(f"Skipping {filename} ({file_size_mb:.2f}MB) - size below threshold")

print("All images processed.")