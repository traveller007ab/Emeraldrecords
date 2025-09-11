import React, { useState } from 'react';
import type { System, Component, Diagram } from '../types';
import Button from './common/Button';
import AiChatAssistant from './AiChatAssistant';
import LogoIcon from './icons/LogoIcon';
import LogoutIcon from './icons/LogoutIcon';
import ResetIcon from './icons/ResetIcon';
import EditIcon from './icons/EditIcon';
import DeleteIcon from './icons/DeleteIcon';
import DiagramIcon from './icons/DiagramIcon';
import TableIcon from './icons/TableIcon';
import JsonIcon from './icons/JsonIcon';


interface DashboardScreenProps {
  systemDocument: System;
  onSystemUpdate: (updatedDocument: System) => void;
  onLogout: () => void;
  onResetSystem: () => void;
}

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
      active
        ? 'text-emerald-400 border-emerald-400'
        : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-700/50'
    }`}
  >
    {children}
  </button>
);

const StructuredView: React.FC<{ document: System }> = ({ document }) => (
    <div className="space-y-6">
        <div>
            <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2 mb-3">Metadata</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                    <p className="text-slate-400">Author</p>
                    <p className="font-medium text-slate-200">{document.metadata.author}</p>
                </div>
                 <div>
                    <p className="text-slate-400">Domain</p>
                    <p className="font-medium text-slate-200 capitalize">{document.metadata.domain}</p>
                </div>
                 <div>
                    <p className="text-slate-400">Version</p>
                    <p className="font-medium text-slate-200">{document.version}</p>
                </div>
                 <div>
                    <p className="text-slate-400">Tags</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {document.metadata.tags.map(tag => (
                            <span key={tag} className="bg-emerald-900 text-emerald-300 text-xs font-medium px-2 py-0.5 rounded-full">{tag}</span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
         <div>
            <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2 mb-3">Components</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-300">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-700/50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Name</th>
                            <th scope="col" className="px-6 py-3">Category</th>
                            <th scope="col" className="px-6 py-3">Connections</th>
                            <th scope="col" className="px-6 py-3">Attributes</th>
                            <th scope="col" className="px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {document.components.map((comp: Component) => (
                            <tr key={comp.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                                <th scope="row" className="px-6 py-4 font-medium text-white whitespace-nowrap">{comp.name}</th>
                                <td className="px-6 py-4 capitalize">{comp.category}</td>
                                <td className="px-6 py-4">{comp.connections.join(', ') || 'None'}</td>
                                <td className="px-6 py-4 font-mono text-xs">{Object.keys(comp.attributes).length > 0 ? JSON.stringify(comp.attributes) : 'None'}</td>
                                <td className="px-6 py-4 text-right">
                                    <button className="p-1 text-slate-400 hover:text-white"><EditIcon className="w-4 h-4" /></button>
                                    <button className="p-1 text-slate-400 hover:text-red-400"><DeleteIcon className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {document.components.length === 0 && (
                    <p className="text-center py-8 text-slate-500">No components defined in the system.</p>
                )}
            </div>
        </div>
    </div>
);

const DiagramView: React.FC<{ diagram: Diagram }> = ({ diagram }) => {
    if (!diagram || diagram.nodes.length === 0) {
        return <div className="text-center py-16 text-slate-500">No diagram data available to display.</div>;
    }

    const PADDING = 50;
    const nodeRadius = 20;

    const allX = diagram.nodes.map(n => n.x);
    const allY = diagram.nodes.map(n => n.y);

    const minX = Math.min(...allX) - PADDING;
    const minY = Math.min(...allY) - PADDING;
    const width = Math.max(...allX) - minX + PADDING;
    const height = Math.max(...allY) - minY + PADDING;
    
    const nodeMap = new Map(diagram.nodes.map(node => [node.id, node]));

    return (
        <div className="w-full h-full bg-slate-900/50 rounded-lg p-4 border border-slate-700">
             <svg viewBox={`${minX} ${minY} ${width} ${height}`} className="w-full h-[500px]">
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#059669" />
                    </marker>
                </defs>
                {diagram.edges.map((edge, i) => {
                    const fromNode = nodeMap.get(edge.from);
                    const toNode = nodeMap.get(edge.to);
                    if (!fromNode || !toNode) return null;
                    
                    const dx = toNode.x - fromNode.x;
                    const dy = toNode.y - fromNode.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const nx = dx / dist;
                    const ny = dy / dist;
                    const targetX = toNode.x - nx * (nodeRadius + 2); // offset for arrowhead
                    const targetY = toNode.y - ny * (nodeRadius + 2);

                    return (
                        <line 
                            key={i}
                            x1={fromNode.x} y1={fromNode.y}
                            x2={targetX} y2={targetY}
                            stroke="#059669" strokeWidth="2"
                            markerEnd="url(#arrowhead)"
                        />
                    );
                })}
                {diagram.nodes.map(node => (
                    <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                        <circle r={nodeRadius} fill="#0d9488" stroke="#6ee7b7" strokeWidth="2" />
                        <text
                            textAnchor="middle" y={nodeRadius + 15}
                            fill="#f1f5f9" fontSize="10" fontWeight="bold"
                            className="pointer-events-none"
                        >
                            {node.label}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
};


const DashboardScreen: React.FC<DashboardScreenProps> = ({ systemDocument, onSystemUpdate, onLogout, onResetSystem }) => {
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('structured');

  const renderContent = () => {
    switch (activeTab) {
      case 'structured':
        return <StructuredView document={systemDocument} />;
      case 'diagram':
        return <DiagramView diagram={systemDocument.diagram} />;
      case 'raw':
        return (
          <pre className="bg-slate-900/70 p-4 rounded-lg text-xs text-slate-300 whitespace-pre-wrap">
            <code>{JSON.stringify(systemDocument, null, 2)}</code>
          </pre>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div className="flex items-center space-x-3">
          <LogoIcon className="h-10 w-10 text-emerald-500" />
          <div>
            <h1 className="text-2xl font-bold text-white">{systemDocument.name}</h1>
            <p className="text-sm text-slate-400 capitalize">{systemDocument.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
           <Button onClick={onResetSystem} variant="secondary" size="sm">
             <ResetIcon className="h-4 w-4 mr-2" /> Reset System
           </Button>
           <Button onClick={onLogout} variant="secondary" size="sm">
             <LogoutIcon className="h-4 w-4 mr-2" /> Logout
           </Button>
        </div>
      </header>

      <div className="flex items-center border-b border-slate-700 mb-6">
        <TabButton active={activeTab === 'structured'} onClick={() => setActiveTab('structured')}>
            <TableIcon className="h-5 w-5" /> Structured View
        </TabButton>
        <TabButton active={activeTab === 'diagram'} onClick={() => setActiveTab('diagram')}>
            <DiagramIcon className="h-5 w-5" /> Diagram View
        </TabButton>
        <TabButton active={activeTab === 'raw'} onClick={() => setActiveTab('raw')}>
            <JsonIcon className="h-5 w-5" /> Raw JSON
        </TabButton>
      </div>

       <div className="relative bg-slate-800/50 rounded-2xl shadow-lg p-6 group max-h-[calc(100vh-220px)] overflow-auto">
            <div className="absolute -inset-px bg-gradient-to-r from-emerald-600 to-sky-600 rounded-2xl opacity-0 group-hover:opacity-70 transition-opacity duration-500 pointer-events-none"></div>
            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-[conic-gradient(from_90deg_at_50%_50%,#059669_0%,#0284c7_50%,#059669_100%)] opacity-20 animate-spin-slow"></div>
            </div>
            <div className="relative z-10">
                {renderContent()}
            </div>
       </div>

       {isChatOpen && (
        <AiChatAssistant
          systemDocument={systemDocument}
          onClose={() => setIsChatOpen(false)}
          onSystemUpdate={onSystemUpdate}
        />
       )}
    </div>
  );
};

export default DashboardScreen;
