#!/usr/bin/env python3

with open('/Volumes/Work-Project/SnapSheet/src/pages/Home.tsx', 'a') as f:
    f.write(''' ||
                newConditionalFormat.condition === 'topN' ||
                newConditionalFormat.condition === 'bottomN' ||
                newConditionalFormat.condition === 'containsText') && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">条件值</label>
                  <input
                    type="text"
                    value={newConditionalFormat.value || ''}
                    onChange={e => setNewConditionalFormat(prev => ({ ...prev, value: e.target.value }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
              {newConditionalFormat.condition === 'between' && (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">最小值</label>
                    <input
                      type="text"
                      value={newConditionalFormat.value || ''}
                      onChange={e => setNewConditionalFormat(prev => ({ ...prev, value: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">最大值</label>
                    <input
                      type="text"
                      value={newConditionalFormat.value2 || ''}
                      onChange={e => setNewConditionalFormat(prev => ({ ...prev, value2: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1">背景颜色</label>
                <input
                  type="color"
                  value={newConditionalFormat.bgColor || '#f8f9fa'}
                  onChange={e => setNewConditionalFormat(prev => ({ ...prev, bgColor: e.target.value }))}
                  className="w-full h-8 rounded cursor-pointer"
                />
              </div>
              <button
                onClick={() => {
                  addConditionalFormat();
                  setShowConditionalPanel(false);
                }}
                className="w-full px-3 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded"
              >
                添加条件格式
              </button>
            </div>
          </div>
        )}

        {showFindPanel && (
          <div className="w-72 border-l border-gray-200 bg-white overflow-y-auto p-4">
            <h3 className="font-semibold text-gray-800 mb-3">查找替换</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">查找内容</label>
                <input
                  ref={findInputRef}
                  type="text"
                  value={findText}
                  onChange={e => {
                    setFindText(e.target.value);
                    findTextInCells();
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      findNext();
                    }
                  }}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  placeholder="输入要查找的内容"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">替换为</label>
                <input
                  type="text"
                  value={replaceText}
                  onChange={e => setReplaceText(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  placeholder="输入替换内容"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={findPrev}
                  disabled={findResults.length === 0}
                  className="flex-1 px-2 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
                >
                  上一个
                </button>
                <button
                  onClick={findNext}
                  disabled={findResults.length === 0}
                  className="flex-1 px-2 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
                >
                  下一个
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={replaceCurrent}
                  disabled={currentFindIndex < 0 || !replaceText}
                  className="flex-1 px-2 py-1.5 text-sm text-gray-700 bg-blue-100 hover:bg-blue-200 rounded disabled:opacity-50"
                >
                  替换
                </button>
                <button
                  onClick={replaceAll}
                  disabled={findResults.length === 0 || !replaceText}
                  className="flex-1 px-2 py-1.5 text-sm text-gray-700 bg-green-100 hover:bg-green-200 rounded disabled:opacity-50"
                >
                  全部替换
                </button>
              </div>

              {findResults.length > 0 && (
                <div className="text-sm text-gray-600">
                  找到 {findResults.length} 个匹配项 (第 {currentFindIndex + 1} 个)
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center h-8 px-4 border-t border-gray-200 bg-gray-50 gap-2">
        <div className="flex items-center gap-1">
          {sheets.map(sheet => (
            <button
              key={sheet.id}
              onClick={() => setActiveSheetId(sheet.id)}
              className={`px-3 py-1 text-xs font-medium rounded ${activeSheetId === sheet.id ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
            >
              {sheet.name}
            </button>
          ))}
          <button
            onClick={handleNewSheet}
            className="px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded"
          >
            +
          </button>
          {sheets.length > 1 && (
            <button
              onClick={handleDeleteSheet}
              className="px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 rounded"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
''')

print("Part 1 appended")
