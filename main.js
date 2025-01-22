// Templates communs pour les sites web
const commonTemplates = [
    { url: '/accueil', title: 'Page d\'accueil' },
    { url: '/contact', title: 'Contact' },
    { url: '/a-propos', title: 'À propos' },
    { url: '/services', title: 'Services' },
    { url: '/blog', title: 'Blog' },
    { url: '/mentions-legales', title: 'Mentions légales' },
    { url: '/politique-confidentialite', title: 'Politique de confidentialité' }
];

let rootNodes = [];

class TreeNode {
    constructor(url) {
        this.url = url;
        this.children = [];
        this.element = this.createNodeElement();
    }

    createNodeElement() {
        const div = document.createElement('div');
        div.className = 'tree-item';
        div.draggable = true;

        const urlText = document.createElement('span');
        urlText.textContent = this.url;
        div.appendChild(urlText);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '×';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            this.delete();
        };
        div.appendChild(deleteBtn);
        
        div.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', this.url);
            div.classList.add('dragging');
        });

        div.addEventListener('dragend', () => {
            div.classList.remove('dragging');
        });

        div.addEventListener('dragover', (e) => {
            e.preventDefault();
            div.classList.add('drag-over');
        });

        div.addEventListener('dragleave', () => {
            div.classList.remove('drag-over');
        });

        div.addEventListener('drop', (e) => {
            e.preventDefault();
            div.classList.remove('drag-over');
            const draggedUrl = e.dataTransfer.getData('text/plain');
            if (draggedUrl !== this.url) {
                moveNode(draggedUrl, this.url);
                renderTree();
            }
        });

        return div;
    }

    delete() {
        const deleteFromArray = (nodes) => {
            for (let i = 0; i < nodes.length; i++) {
                if (nodes[i].url === this.url) {
                    nodes.splice(i, 1);
                    return true;
                }
                if (nodes[i].children.length && deleteFromArray(nodes[i].children)) {
                    return true;
                }
            }
            return false;
        };

        deleteFromArray(rootNodes);
        renderTree();
        saveToLocalStorage();
    }
}

function initializeTemplates() {
    const container = document.getElementById('templateButtons');
    commonTemplates.forEach(template => {
        const button = document.createElement('button');
        button.className = 'template-button';
        button.textContent = template.title;
        button.onclick = () => addTemplateUrl(template.url);
        container.appendChild(button);
    });
}

function addTemplateUrl(url) {
    const node = new TreeNode(url);
    rootNodes.push(node);
    renderTree();
    saveToLocalStorage();
}

function addPage() {
    const input = document.getElementById('pageUrl');
    const url = input.value.trim();
    
    if (url) {
        if (!url.startsWith('/')) {
            alert('L\'URL doit commencer par un /');
            return;
        }
        
        const node = new TreeNode(url);
        rootNodes.push(node);
        input.value = '';
        renderTree();
        saveToLocalStorage();
    }
}

function handleFileUpload() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const urls = e.target.result.split('\n')
                .map(url => url.trim())
                .filter(url => url && url.startsWith('/'));
            
            urls.forEach(url => {
                rootNodes.push(new TreeNode(url));
            });
            renderTree();
            saveToLocalStorage();
        };
        reader.readAsText(file);
    }
}

function moveNode(sourceUrl, targetUrl) {
    let sourceNode = null;
    let sourceParent = null;
    
    function findSource(nodes, parent = null) {
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].url === sourceUrl) {
                sourceNode = nodes[i];
                sourceParent = parent;
                return true;
            }
            if (nodes[i].children.length && findSource(nodes[i].children, nodes[i])) {
                return true;
            }
        }
        return false;
    }
    
    findSource(rootNodes);
    
    if (sourceNode) {
        if (sourceParent) {
            sourceParent.children = sourceParent.children.filter(n => n.url !== sourceUrl);
        } else {
            rootNodes = rootNodes.filter(n => n.url !== sourceUrl);
        }
        
        function addToTarget(nodes) {
            for (let node of nodes) {
                if (node.url === targetUrl) {
                    node.children.push(sourceNode);
                    return true;
                }
                if (node.children.length && addToTarget(node.children)) {
                    return true;
                }
            }
            return false;
        }
        
        if (!addToTarget(rootNodes)) {
            rootNodes.push(sourceNode);
        }
    }
    saveToLocalStorage();
}

function renderTree() {
    const treeContainer = document.getElementById('siteTree');
    treeContainer.innerHTML = '';
    
    function renderNode(node, container) {
        container.appendChild(node.element);
        
        if (node.children.length > 0) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'tree-children';
            node.children.forEach(child => renderNode(child, childrenContainer));
            container.appendChild(childrenContainer);
        }
    }
    
    rootNodes.forEach(node => renderNode(node, treeContainer));
}

function exportTree() {
    function generateTreeText(nodes, level = 0) {
        let result = '';
        nodes.forEach(node => {
            result += '  '.repeat(level) + node.url + '\n';
            if (node.children.length > 0) {
                result += generateTreeText(node.children, level + 1);
            }
        });
        return result;
    }
    
    const treeText = generateTreeText(rootNodes);
    const blob = new Blob([treeText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'arborescence-site.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function saveToLocalStorage() {
    function serializeNode(node) {
        return {
            url: node.url,
            children: node.children.map(serializeNode)
        };
    }
    
    const serializedData = rootNodes.map(serializeNode);
    localStorage.setItem('siteTree', JSON.stringify(serializedData));
}

function loadFromLocalStorage() {
    const savedData = localStorage.getItem('siteTree');
    if (savedData) {
        try {
            const parsedData = JSON.parse(savedData);
            
            function deserializeNode(data) {
                const node = new TreeNode(data.url);
                node.children = data.children.map(deserializeNode);
                return node;
            }
            
            rootNodes = parsedData.map(deserializeNode);
            renderTree();
        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
        }
    }
}

// Initialiser l'application
initializeTemplates();
loadFromLocalStorage();