# Firefox 浏览器中查看模型缓存的指南

## 问题说明

在 Firefox 浏览器中，`@xenova/transformers` 的模型缓存可能存储在以下位置：

1. **IndexedDB** - 浏览器数据库
2. **Cache API** - 浏览器缓存存储
3. **其他存储位置** - 取决于库的实现

## 在 Firefox 中查看缓存的方法

### 方法 1：使用 Firefox 开发者工具查看 IndexedDB

1. **打开开发者工具**

   - 按 `F12` 或 `Ctrl+Shift+I` (Windows/Linux)
   - 或 `Cmd+Option+I` (Mac)

2. **切换到存储标签**

   - 点击顶部的 **"存储"** (Storage) 标签
   - 如果没有看到，点击右上角的 `☰` 菜单，选择 "存储"

3. **查看 IndexedDB**

   - 在左侧面板展开 **"IndexedDB"**
   - 查找以下数据库名称（可能包含）：
     - `transformers-cache`
     - `hf-transformers`
     - `xenova-transformers`
     - 或其他包含 "transformers" 或 "cache" 的名称

4. **查看数据库内容**
   - 点击数据库名称展开
   - 查看对象存储（Object Stores）
   - 点击对象存储查看存储的键值对

### 方法 2：使用 Firefox 开发者工具查看 Cache API

1. **打开开发者工具** (F12)

2. **切换到存储标签**

3. **查看缓存存储**

   - 在左侧面板展开 **"缓存存储"** (Cache Storage)
   - 查找包含以下名称的缓存：
     - `transformers`
     - `hf-transformers`
     - `xenova`
     - 或其他相关名称

4. **查看缓存内容**
   - 点击缓存名称展开
   - 查看缓存的请求/响应条目

### 方法 3：使用浏览器控制台检查

在浏览器控制台（Console）中运行以下代码：

```javascript
// 检查 IndexedDB
async function checkIndexedDB() {
  try {
    const databases = await indexedDB.databases();
    console.log("IndexedDB 数据库列表:", databases);
    return databases;
  } catch (e) {
    console.error("无法访问 IndexedDB:", e);
  }
}

// 检查 Cache API
async function checkCacheAPI() {
  try {
    const cacheNames = await caches.keys();
    console.log("Cache API 缓存列表:", cacheNames);

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      console.log(`${cacheName}: ${keys.length} 个条目`);
    }
    return cacheNames;
  } catch (e) {
    console.error("无法访问 Cache API:", e);
  }
}

// 运行检查
checkIndexedDB();
checkCacheAPI();
```

### 方法 4：查看控制台日志

代码已经添加了缓存检查功能，在模型加载时会在控制台输出：

- `[Cache] IndexedDB 数据库列表:` - 显示所有 IndexedDB 数据库
- `[Cache] Cache API 缓存列表:` - 显示所有 Cache API 缓存
- `[Cache] 环境配置:` - 显示缓存相关的环境配置

## 为什么可能看不到缓存？

### 1. 模型尚未成功加载

- **原因**: 只有成功加载模型后，缓存才会被创建
- **解决**: 确保模型加载完成（查看控制台的 `[Transformers] ✅ 模型加载成功` 消息）

### 2. 缓存使用了不同的名称

- **原因**: `@xenova/transformers` 可能使用自定义的数据库名称
- **解决**: 查看控制台日志中的 `[Cache]` 输出，找到实际的数据库名称

### 3. 缓存被存储在 Cache API 而不是 IndexedDB

- **原因**: 某些版本的库可能优先使用 Cache API
- **解决**: 检查 "缓存存储" (Cache Storage) 而不是 IndexedDB

### 4. 浏览器隐私设置

- **原因**: Firefox 的隐私模式或某些设置可能阻止缓存
- **解决**: 检查浏览器设置，确保允许网站存储数据

### 5. 缓存被清除

- **原因**: 浏览器自动清理或手动清除
- **解决**: 重新加载模型，缓存会重新创建

## 验证缓存是否工作

1. **首次加载模型**

   - 观察网络请求（Network 标签）
   - 应该看到从 `huggingface.co` 下载模型文件

2. **刷新页面重新加载**

   - 如果缓存工作，应该：
     - 网络请求明显减少或没有
     - 加载速度更快
     - 控制台显示 `[Cache]` 相关的缓存信息

3. **检查控制台日志**
   - 查找 `[Cache]` 开头的日志
   - 确认缓存数据库和条目数量

## 清除缓存（如果需要）

### 清除 IndexedDB

1. 打开开发者工具 → 存储标签
2. 展开 IndexedDB
3. 右键点击数据库 → 删除数据库

### 清除 Cache API

1. 打开开发者工具 → 存储标签
2. 展开缓存存储
3. 右键点击缓存 → 删除缓存

### 使用控制台清除

```javascript
// 清除所有 IndexedDB 数据库（谨慎使用）
indexedDB.databases().then((databases) => {
  databases.forEach((db) => {
    indexedDB.deleteDatabase(db.name);
  });
});

// 清除所有 Cache API 缓存（谨慎使用）
caches.keys().then((cacheNames) => {
  cacheNames.forEach((cacheName) => {
    caches.delete(cacheName);
  });
});
```

## 注意事项

- 模型文件通常很大（几百 MB），首次下载需要时间
- 缓存存储在浏览器中，清除浏览器数据会删除缓存
- 不同浏览器可能使用不同的存储机制
- 某些隐私模式可能禁用缓存
