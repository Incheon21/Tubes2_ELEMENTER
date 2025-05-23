import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { TreeData, Algorithm } from '../types/types';
import TreeSelector from './TreeSelector';
import TreeDetails from './TreeDetails';

interface VisualizationPanelProps {
  currentTrees: TreeData[];
  currentTreeIndex: number;
  setCurrentTreeIndex: (index: number) => void;
  targetElement: string;
  algorithm: Algorithm;
}


interface NodeData {
  name: string;
  isBaseElement?: boolean;
  isCircularReference?: boolean;
  noRecipe?: boolean;
  imagePath?: string;
  children: NodeData[];
  _collapsed?: boolean;
}

const VisualizationPanel: React.FC<VisualizationPanelProps> = ({
  currentTrees,
  currentTreeIndex,
  setCurrentTreeIndex,
  targetElement,
  algorithm
}) => {
  const visualizationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentTrees.length > 0 && currentTreeIndex < currentTrees.length) {
      visualizeTree(currentTrees[currentTreeIndex]);
    }
  }, [currentTrees, currentTreeIndex]);

  const visualizeTree = (treeData: TreeData) => {
    if (!treeData || !visualizationRef.current) return;
    
    d3.select(visualizationRef.current).selectAll("*").remove();
    
    const margin = {top: 40, right: 90, bottom: 50, left: 90};
    const width = visualizationRef.current.offsetWidth - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;
    
    const svg = d3.select(visualizationRef.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .call(d3.zoom<SVGSVGElement, unknown>().on("zoom", (event) => {
        g.attr("transform", event.transform);
      }));
      
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    const hierarchyData: NodeData = {
      name: treeData.name,
      isBaseElement: treeData.isBaseElement,
      isCircularReference: treeData.isCircularReference,
      noRecipe: treeData.noRecipe,
      imagePath: treeData.imagePath,
      children: treeData.ingredients ? treeData.ingredients.map(ing => processNode(ing)) : []
    };
    
    function processNode(node: TreeData): NodeData {
      return {
        name: node.name,
        isBaseElement: node.isBaseElement,
        isCircularReference: node.isCircularReference,
        noRecipe: node.noRecipe,
        imagePath: node.imagePath,
        children: node.ingredients ? node.ingredients.map(ing => processNode(ing)) : []
      };
    }
    
    const treeLayout = d3.tree<NodeData>()
      .size([width, height])
      .separation(() => 1);
    
    const root = d3.hierarchy(hierarchyData);
    
    const MAX_VISIBLE_DEPTH = 15;
    const limitDepth = (node: d3.HierarchyNode<NodeData>, currentDepth: number): void => {
      if (currentDepth >= MAX_VISIBLE_DEPTH && node.children) {
        node.data._collapsed = true;
        node.children = undefined;
      } else if (node.children) {
        node.children.forEach(child => limitDepth(child, currentDepth + 1));
      }
    };
    
    limitDepth(root, 0);
    treeLayout(root);
    g.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", d3.linkVertical<d3.HierarchyLink<NodeData>, d3.HierarchyNode<NodeData>>()
        .x(d => d.x || 0)
        .y(d => d.y || 0))
      .style("fill", "none")
      .style("stroke", "#ccc")
      .style("stroke-width", "2px");
    
    const nodes = g.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x},${d.y})`);
    
    nodes.append("circle")
      .attr("r", 6)
      .style("fill", (d: d3.HierarchyNode<NodeData>) => {
        if (d.data.isBaseElement) return "#FFEB3B";
        if (d.data.isCircularReference) return "#FF9800"; 
        if (d.data.noRecipe) return "#E0E0E0"; 
        if (d.depth === 0) return "#4CAF50"; 
        if (d.data._collapsed) return "#9C27B0"; 
        return "#2196F3";  
      })
      .style("stroke", "#fff")
      .style("stroke-width", "1.5px")
      .append("title")
      .text(d => d.data.name);
    
    nodes.append("text")
      .attr("dy", ".35em")
      .attr("x", (d: d3.HierarchyNode<NodeData>) => d.children ? -13 : 13)
      .attr("text-anchor", (d: d3.HierarchyNode<NodeData>) => d.children ? "end" : "start")
      .text((d: d3.HierarchyNode<NodeData>) => d.data.name)
      .style("font-size", "12px")
      .style("font-family", "sans-serif");
      
    svg.append("text")
      .attr("x", 10)
      .attr("y", 20)
      .text("Scroll to zoom, drag to pan")
      .style("font-size", "12px")
      .style("fill", "#666");
      
    if (root.descendants().length > 50) {
      svg.append("text")
        .attr("x", 10)
        .attr("y", 40)
        .text(`Showing ${MAX_VISIBLE_DEPTH} levels (tree is deep)`)
        .style("font-size", "12px")
        .style("fill", "#f44336");
    }
  };

  return (
    <div className="w-full lg:w-2/3 bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 py-4 px-6">
        <h2 className="text-xl font-semibold text-white">Recipe Visualization</h2>
      </div>
      
      {currentTrees.length > 1 && (
        <div className="p-4 bg-blue-50 border-b border-blue-100">
          <TreeSelector 
            count={currentTrees.length} 
            currentIndex={currentTreeIndex} 
            setCurrentIndex={setCurrentTreeIndex} 
          />
        </div>
      )}
      
      <div 
        ref={visualizationRef} 
        className="w-full border-b border-gray-200 overflow-auto bg-gradient-to-br from-gray-50 to-white"
        style={{ height: '500px' }}
      >
        {currentTrees.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center p-8">
              <div className="mb-4">
                <svg className="w-16 h-16 mx-auto text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2 text-gray-600">No recipe data to display</h3>
              <p className="text-gray-500 max-w-md">Enter an element name and click "Find Recipes" to see its crafting tree.</p>
            </div>
          </div>
        )}
      </div>
      
      {currentTrees.length > 0 && currentTreeIndex < currentTrees.length && (
        <div className="p-6">
          <TreeDetails 
            tree={currentTrees[currentTreeIndex]} 
            targetElement={targetElement}
            algorithm={algorithm}
          />
        </div>
      )}
    </div>
  );
};

export default VisualizationPanel;