/**
 * Z-Index System
 * Layering and stacking order
 */

const zIndex = {
  // ============================================
  // BASE LAYERS
  // ============================================
  hide: -1,
  auto: 'auto',
  base: 0,
  
  // ============================================
  // COMPONENT LAYERS
  // ============================================
  // Content layers (0-10)
  content: 1,
  raised: 2,
  
  // Navigation layers (10-20)
  dropdown: 10,
  sticky: 15,
  
  // Fixed elements (20-30)
  fixed: 20,
  header: 25,
  sidebar: 25,
  
  // Overlay layers (30-50)
  overlay: 30,
  drawer: 35,
  modal: 40,
  modalBackdrop: 39,
  
  // Notification layers (50-70)
  popover: 50,
  tooltip: 60,
  toast: 70,
  notification: 70,
  
  // System layers (100+)
  max: 9999,

  // ============================================
  // NAMED LAYERS (for easier reference)
  // ============================================
  layers: {
    // Base content
    base: 0,
    content: 1,
    
    // Elevated content
    card: 2,
    cardHover: 3,
    
    // Dropdowns and menus
    dropdown: 10,
    select: 10,
    autocomplete: 11,
    
    // Sticky elements
    sticky: 15,
    stickyHeader: 16,
    
    // Fixed elements
    fixed: 20,
    topbar: 25,
    sidebar: 25,
    floatingButton: 28,
    
    // Overlay elements
    overlay: 30,
    drawer: 35,
    drawerBackdrop: 34,
    dialog: 40,
    dialogBackdrop: 39,
    modal: 40,
    modalBackdrop: 39,
    
    // Popover elements
    popover: 50,
    contextMenu: 51,
    tooltip: 60,
    
    // Notification elements
    toast: 70,
    notification: 70,
    alert: 75,
    
    // Debug/Dev tools
    devTools: 100,
    
    // Maximum
    max: 9999,
  },
};

export default zIndex;