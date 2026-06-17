#!/usr/bin/env python3

with open('/Volumes/Work-Project/SnapSheet/src/pages/Home.tsx', 'r') as f:
    lines = f.readlines()

fixed_lines = lines[:1661]

additional_content = '''          <div className="relative group">
            <button className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded">
              格式 ▾
            </button>
            <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg hidden group-hover:block z-50 p-2">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button onClick={() => applyNumberFormat({ type: 'general' })} className="px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 rounded">
                  常规
                </button>
                <button onClick={() => applyNumberFormat({ type: 'number', decimalPlaces: 2 })} className="px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 rounded">
                  数字 (2位)
                </button>
                <button onClick={() => applyNumberFormat({ type: 'currency', currencySymbol: '¥' })} className="px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 rounded">
                  货币
                </button>
                <button onClick={() => applyNumberFormat({ type: 'percentage' })} className="px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 rounded">
                  百分比
                </button>
              </div>
              <div className="border-t border-gray-200 my-2" />
              <div className="space-y-1">
                <div className="flex items-center gap-2 px-2 py-1">
                  <span className="w-4 h-4 bg-red-500 rounded" />
                  <button onClick={() => setColor('#d93025')} className="text-xs text-gray-700 hover:bg-gray-50 rounded">
                    红色字体
                  </button>
                </div>
                <div className="flex items-center gap-2 px-2 py-1">
                  <span className="w-4 h-4 bg-green-200 rounded" />
                  <button onClick={() => setBgColor('#d4edda')} className="text-xs text-gray-700 hover:bg-gray-50 rounded">
                    绿色背景
                  </button>
                </div>
                <div className="flex items-center gap-2 px-2 py-1">
                  <span className="w-4 h-4 bg-yellow-200 rounded" />
                  <button onClick={() => setBgColor('#fff3cd')} className="text-xs text-gray-700 hover:bg-gray-50 rounded">
                    黄色背景
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="relative group">
            <button className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded">
              数据 ▾
            </button>
            <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg hidden group-hover:block z-50">
              <button onClick={() => sortColumn(true)} className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                升序排序
              </button>
              <button onClick={() => sortColumn(false)} className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                降序排序
              </button>
              <div className="border-t border-gray-200 my-1" />
              <button onClick={() => setFrozenRows(frozenRows === 0 ? 1 : 0)} className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                {frozenRows > 0 ? '取消冻结首行' : '冻结首行'}
              </button>
              <button onClick={() => setFrozenCols(frozenCols === 0 ? 1 : 0)} className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                {frozenCols > 0 ? '取消冻结首列' : '冻结首列'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFormatPanel(!showFormatPanel)}
            className={`px-3 py-1.5 text-sm font-medium rounded ${showFormatPanel ? 'bg-blue-100 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            数字格式
          </button>
          <button
            onClick={() => setShowConditionalPanel(!showConditionalPanel)}
            className={`px-3 py-1.5 text-sm font-medium rounded ${showConditionalPanel ? 'bg-blue-100 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            条件格式
          </button>
          <button
            onClick={() => setShowFindPanel(!showFindPanel)}
            className={`px-3 py-1.5 text-sm font-medium rounded ${showFindPanel ? 'bg-blue-100 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            查找替换
          </button>
          <button
            onClick={() => setShowAIPanel(!showAIPanel)}
            className={`px-3 py-1.5 text-sm font-medium rounded ${showAIPanel ? 'bg-blue-100 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            AI 分析
          </button>
          <span className="text-sm text-gray-500">SnapSheet</span>
        </div>
      </div>

      <div className="flex items-center h-9 px-4 border-b border-gray-200 bg-gray-50 gap-4">
        <div className="flex items-center justify-center w-16 font-mono text-sm font-medium text-gray-600">
          {currentCellRef}
        </div>
        <div className="flex-1 relative">
          {isEditing ? (
            <input
              ref={editInputRef}
              type="text"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onBlur={commitEdit}
              className="w-full h-7 px-2 text-sm font-mono border-2 border-blue-500 rounded outline-none"
              autoFocus
            />
          ) : (
            <div
              onClick={() => {
                setEditValue(currentCell?.formula || currentCell?.value || '');
                setIsEditing(true);
                setTimeout(() => editInputRef.current?.focus(), 0);
              }}
              className="w-full h-7 px-2 text-sm font-mono border border-transparent hover:border-gray-300 rounded cursor-text flex items-center truncate"
            >
              {currentCell?.formula || currentCell?.value || ''}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div
          ref={containerRef}
          className="flex-1 overflow-auto relative"
          onScroll={handleScroll}
          onWheel={handleWheel}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            onDoubleClick={handleCanvasDoubleClick}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            className={`absolute inset-0 outline-none ${isDraggingCol ? 'cursor-col-resize' : isDraggingRow ? 'cursor-row-resize' : ''}`}
          />
        </div>

        {showAIPanel && (
          <div className="w-72 border-l border-gray-200 bg-white overflow-y-auto p-4">
            <h3 className="font-semibold text-gray-800 mb-3">AI 数据分析</h3>
            <div className="text-sm text-gray-600 mb-2">
              选中区域: {coordsToCell(selection.startRow, selection.startCol)} - {coordsToCell(selection.endRow, selection.endCol)}
            </div>

            {aiAnalysis ? (
              <div className="space-y-3">
                <div className="bg-gray-50 rounded p-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">数量:</span> {aiAnalysis.count}</div>
                    <div><span className="text-gray-500">总和:</span> {aiAnalysis.sum.toFixed(2)}</div>
                    <div><span className="text-gray-500">平均:</span> {aiAnalysis.avg.toFixed(2)}</div>
                    <div><span className="text-gray-500">最大:</span> {aiAnalysis.max.toFixed(2)}</div>
                    <div><span className="text-gray-500">最小:</span> {aiAnalysis.min.toFixed(2)}</div>
                    <div><span className="text-gray-500">范围:</span> {aiAnalysis.range.toFixed(2)}</div>
                  </div>
                </div>

                <div className="bg-blue-50 rounded p-3">
                  <div className="text-sm font-medium text-blue-700 mb-1">趋势分析</div>
                  <div className="text-sm text-blue-600">
                    数据整体{aiAnalysis.trend}，平均值位于区间{aiAnalysis.avg > aiAnalysis.max * 0.7 ? '上' : aiAnalysis.avg < aiAnalysis.min * 1.3 ? '下' : '中'}部。
                  </div>
                </div>

                <div className="bg-green-50 rounded p-3">
                  <div className="text-sm font-medium text-green-700 mb-1">建议公式</div>
                  <div className="text-xs text-green-600 space-y-1">
                    <div>=SUM({coordsToCell(selection.startRow, selection.startCol)}:{coordsToCell(selection.endRow, selection.endCol)})</div>
                    <div>=AVG({coordsToCell(selection.startRow, selection.startCol)}:{coordsToCell(selection.endRow, selection.endCol)})</div>
                    <div>=MAX({coordsToCell(selection.startRow, selection.startCol)}:{coordsToCell(selection.endRow, selection.endCol)})</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">
                选中包含数值的单元格以查看分析结果
              </div>
            )}
          </div>
        )}

        {showFormatPanel && (
          <div className="w-72 border-l border-gray-200 bg-white overflow-y-auto p-4">
            <h3 className="font-semibold text-gray-800 mb-3">数字格式</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">格式类型</label>
                <select
                  value={newNumberFormat.type}
                  onChange={e => setNewNumberFormat(prev => ({ ...prev, type: e.target.value as NumberFormat['type'] }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                >
                  <option value="general">常规</option>
                  <option value="number">数字</option>
                  <option value="currency">货币</option>
                  <option value="percentage">百分比</option>
                </select>
              </div>
              {(newNumberFormat.type === 'number' || newNumberFormat.type === 'currency' || newNumberFormat.type === 'percentage') && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">小数位数</label>
                  <input
                    type="number"
                    value={newNumberFormat.decimalPlaces || 0}
                    onChange={e => setNewNumberFormat(prev => ({ ...prev, decimalPlaces: parseInt(e.target.value) || 0 }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    min="0"
                    max="10"
                  />
                </div>
              )}
              {newNumberFormat.type === 'currency' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">货币符号</label>
                  <input
                    type="text"
                    value={newNumberFormat.currencySymbol || '¥'}
                    onChange={e => setNewNumberFormat(prev => ({ ...prev, currencySymbol: e.target.value }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
              <button
                onClick={() => {
                  applyNumberFormat(newNumberFormat);
                  setShowFormatPanel(false);
                }}
                className="w-full px-3 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded"
              >
                应用格式
              </button>
            </div>
          </div>
        )}

        {showConditionalPanel && (
          <div className="w-72 border-l border-gray-200 bg-white overflow-y-auto p-4">
            <h3 className="font-semibold text-gray-800 mb-3">条件格式</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">条件类型</label>
                <select
                  value={newConditionalFormat.condition}
                  onChange={e => setNewConditionalFormat(prev => ({ ...prev, condition: e.target.value as ConditionalFormat['condition'] }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                >
                  <option value="greaterThan">大于</option>
                  <option value="lessThan">小于</option>
                  <option value="equalTo">等于</option>
                  <option value="between">介于</option>
                  <option value="containsText">包含文本</option>
                  <option value="topN">Top N</option>
                  <option value="bottomN">Bottom N</option>
                  <option value="aboveAverage">高于平均值</option>
                  <option value="belowAverage">低于平均值</option>
                </select>
              </div>
              {(newConditionalFormat.condition === 'greaterThan' || 
                newConditionalFormat.condition === 'lessThan' || 
                newConditionalFormat.condition === 'equalTo' ||
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
'''

fixed_lines.append(additional_content)

with open('/Volumes/Work-Project/SnapSheet/src/pages/Home.tsx', 'w') as f:
    f.writelines(fixed_lines)

print('Fixed Home.tsx')
