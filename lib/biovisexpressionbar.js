//var jQuery = require('jquery');
//require('jquery-ui');

var d3 = require('d3');
require('d3-ease');
var science = require('science');
var colorbrewer = require('colorbrewer');
// load everything

var exts = require('./d3Extensions.js');
var dataContainer = require( './dataContainer.js' );
var barPlot = require('./barPlot.js');
var ternaryPlot = require('./ternaryPlot.js');
var heatmap = require('./heatmap.js');
require('string.prototype.startswith');
//require("jquery-ui-browserify");
//qvar stats = require('stats-lite');
/*
 * expression-bar
 * https://github.com/homonecloco/expression-bar
 *
 * Copyright (c) 2014 Ricardo H. Ramirez-Gonzalez
 * Licensed under the MIT license.
 */

/**
@class expressionbar
*/

/**
 * Private Methods
 */

/*
 * Public Methods
 */




// The constructor for the creating the chart
var ExpressionBar = function (options) {
  try{
    this.setDefaultOptions();    
    jQuery.extend(this.opt, options);
    this._setUserDefaultValues();
    this.setupContainer();
    this.setupButtons();
    this.setupProgressBar();
    this.setupSVG();
    this.loadExpression(this.opt.data);    
  } catch(err){
    alert('An error has occured');
    console.error(err);
    if(typeof $(`#bar_expression_viewer-progressbar`) !== 'undefined'){
      $(`#bar_expression_viewer-progressbar`).hide();
    }
  }   
};

ExpressionBar.prototype._setUserDefaultValues = function (){
  	this.opt.sc = d3.schemeCategory20;
    this.opt.defaultGroupBy = this.opt.groupBy;
    this.opt.defaultRenderProperty = this.opt.renderProperty;
    this.opt.calculateLog = this.opt.defaultLog2State;
    this._storeValue('calculateLog',this.opt.calculateLog);
    this.opt.showTernaryPlot = false;
};

ExpressionBar.prototype._restoreUserDefaults = function(){
  this.opt.groupBy = this.opt.defaultGroupBy;
  this.opt.renderProperty = this.opt.defaultRenderProperty;
  this.opt.selectedFactors = this.data.selectedFactors;
  this.opt.calculateLog = this.opt.defaultLog2State;
  this._storeValue('calculateLog',this.opt.calculateLog);
  this.opt.showTernaryPlot = false;
  this.opt.showHomoeologues = false;

  if(this.opt.plot == 'Ternary'){    
    this.opt.plot = 'Bar';
  }

};

ExpressionBar.prototype._selectPlotType = function(){



   switch(this.opt.plot){
		case 'Bar':
		$(`#${this.opt.target}_log2Span`).css('display', 'initial');
    this.opt.calculateLog = this._retrieveValue("calculateLog");
    this.opt.showTernaryPlot = false;
    this.renderObject = new barPlot.BarPlot(this);
    break;

		case 'HeatMap':
		$(`#${this.opt.target}_log2Span`).css('display', 'initial');
    this.opt.showHomoeologues = true;
    this.opt.showTernaryPlot = false;
    // If there is no session value for calculate log show the log2 for heatmap
    this.opt.calculateLog = this._retrieveValue('calculateLog');
    this.renderObject = new heatmap.HeatMap(this);
    break;

		case 'Ternary':
    if($(`#${this.opt.target}_log2`).prop('checked')){
      $(`#${this.opt.target}_log2`).click();
    }    
		$(`#${this.opt.target}_log2Span`).css('display', 'none');    
    this.opt.showHomoeologues = true;
    this.opt.showTernaryPlot = true;
    this.opt.calculateLog = this._retrieveValue("calculateLog");    
    this.renderObject = new ternaryPlot.TernaryPlot(this);
    break;
    default:
    console.error('plot options must be "Bar" or "HeatMap. Used ' + this.opt.plot);
    return;
  }
}

ExpressionBar.prototype._restoreProperty = function(key){
  var stored = this._retrieveValue(key);
  if(stored){
    this.opt[key] = stored;
  }
};

ExpressionBar.prototype.restoreDefaults = function(){
  this._removeValue('groupBy');
  this._removeValue('renderProperty');
  this._removeValue('sortOrder');
  this._removeValue('renderedOrder');
  this._removeValue('selectedFactors');
  this._removeValue('showHomoeologues');
  this._removeValue('calculateLog');
  this._removeValue('showTernaryPlot');
  this._selectPlotType();
  this._restoreUserDefaults();
  
  this.data.sortOrder = [];
  this.dataLoaded();
  this.refresh();
};

ExpressionBar.prototype.restoreDisplayOptions = function(){
  this._restoreProperty('groupBy');
  this._restoreProperty('renderProperty');
  this._restoreProperty('sortOrder');
  this._restoreProperty('renderedOrder');
  this._restoreProperty('selectedFactors');
  this._restoreProperty('showHomoeologues');
  this._restoreProperty('showTernaryPlot');
  this._restoreProperty('colorFactor');
  this._restoreProperty('calculateLog');
  // should we add an option to the orders?
  // this can tide up this bit
  if(typeof this.opt.sortOrder !== 'undefined'){
    this.data.sortOrder = this.opt.sortOrder;
  }else{
    this.data.sortOrder = [];
  }

  var hom_checked = false;
  if(this.opt.showHomoeologues){
    hom_checked = true;    
  }
  jQuery( '#' + this.opt.target + '_showHomoeologues' )
  .prop('checked', hom_checked);


  var tplot_checked = false;    
  if(this.opt.showTernaryPlot){    
    tplot_checked = true;
    // Preventing the site to crash if the ternary plot is true in the session but data is compare or heatmap    
    if((typeof this.data.compare === "undefined" || this.data.compare.length == 0) && this.opt.plot != "HeatMap"){    
      this.opt.plot = 'Ternary';
    }
  }  
  jQuery( '#' + this.opt.target + '_showTernaryPlot' )
  .prop('checked', tplot_checked);


  var log_checked = false;
  if(this.opt.calculateLog){
    this.opt.calculateLog = true;
    log_checked = true;
  }
  jQuery( '#' + this.opt.target + '_log2' )
  .prop('checked', log_checked);

};

ExpressionBar.prototype.setupProgressBar = function(){
  var progressBarId  =  this.opt.target + '_progressbar';
  this.pb = jQuery( '#' + progressBarId );
  this.pb.attr('height', '20px');
  this.pb.attr('min-height', '20px');
  this.pb.progressbar({
    value: false
  });
  this.pb.hide();
};

ExpressionBar.prototype.setupSVG = function(){    

  var self = this;
  var fontSize = this.opt.fontSize;
  this.renderGroupSelectorColour();
  this.chart = d3.select('#'+this.chartSVGid).
  attr('width', this.opt.width).    
  style('font-family', self.opt.fontFamily).
  style( 'font-size', fontSize + 'px');

  this.chartHead = d3.select('#'+this.chartSVGidHead).
  attr('width', this.opt.width).
  style('font-family', self.opt.fontFamily).
  style( 'font-size', fontSize + 'px');
  this.chartHead.attr('height', this.opt.headerOffset);


  this.chartFoot = d3.select('#'+this.chartSVGidFoot).
  attr('width', this.opt.width);
  this.chartFoot.attr('height', 40).
  style('font-family', self.opt.fontFamily).
  style( 'font-size', fontSize + 'px');


  this.barGroups = [];

  this.chart.on('mousemove', function(e){
    self.highlightRow(this);
  });
  this.chart.on('mousemove', function(e){
    self.highlightRow(this);
  });
  this.chart.on('mouseenter', function(e){
    self.renderObject.showHighithRow();
  });
  this.chart.on('mouseleave', function(e){
    self.renderObject.hideHidelightRow();
  });
};



ExpressionBar.prototype.setupButtons = function(){
 var self = this;
 this.propertySelector = jQuery('#'+ this.opt.target+'_property');
 this.groupSelectorColour = jQuery('#'+ this.opt.target+'_group');
 this.saveSVGButton = jQuery('#'+ this.opt.target+'_save');
 this.saveSVGButton.click(function(e) {
  self.saveRenderedSVG();
});

 this.savePNGButton = jQuery('#'+ this.opt.target+'_save_png');
 this.savePNGButton.click(function(e) {
  self.saveRenderedPNG();
});
};

ExpressionBar.prototype.setupContainer = function(){

  var self = this;
  this._container = $('#'+self.opt.target);  
  this.chartSVGid =this.opt.target+'_chart_svg';
  this.chartSVGidHead =this.opt.target+'_header_svg';
  this.chartSVGidHeadDiv =this.opt.target+'_header_div';
  this.chartSVGidFoot =this.opt.target+'_footer_svg';
  this.sortDivId = this.opt.target + '_sort_div';
  this.chartScale = this.opt.target + '_scale';  
  this.plotContainer = this.opt.target + '_plot_container'
  

	var containerContent = `<div id="${this.opt.target}_options">
	<label for="${this.opt.target}_property" style="cursor: pointer;">Expression unit: </label><select style="cursor: pointer;" id="${this.opt.target}_property"></Select>
	<span id="${this.opt.target}_log2Span"><input type="checkbox" id="${this.opt.target}_log2" style="cursor: pointer;"><label for="${this.opt.target}_log2" style="cursor: pointer;">Log<sub>2</sub></label></input></span>
  <button type="button" style="cursor: pointer;" id="${this.opt.target}_save">Save as SVG</button>
  <button type="button" style="cursor: pointer;" id="${this.opt.target}_save_png">Save as PNG</button>
  <button type="button" style="cursor: pointer;" id="${this.opt.target}_save_data">Save data</button>
  <button type="button" style="cursor: pointer;" id="${this.opt.target}_save_raw_data">Save raw data</button>
  <button type="button" style="cursor: pointer;" id="${this.opt.target}_restore_defaults">Restore Defaults</button>
  <span id="${this.opt.target}_homSpan"><input style="cursor: pointer;" id="${this.opt.target}_showHomoeologues" type="checkbox"name="showHomoeologues" value="show"><label style="cursor: pointer;" for="${this.opt.target}_showHomoeologues">Homoeologues</label></input> </span>
  <span id="${this.opt.target}_ternSpan"><input style="cursor: pointer;" id="${this.opt.target}_showTernaryPlot" type="checkbox"name="showHomoeologues" value="show"><label style="cursor: pointer;" for="${this.opt.target}_showTernaryPlot">Show Ternary Plot</label></input></span>
  <div id="${this.chartScale}"></div>
  </div>
  <br />
  <div id="${this.chartSVGidHeadDiv}" style="overflow: inherit;">
  <svg id="${this.chartSVGidHead}" ></svg>
  </div>
	<div id="${this.opt.target}-progressbar"></div>  
  <div id="${this.sortDivId}" style="position: relative; height: 40px;" ></div>
  <div style="display: block; overflow-y: scroll;" id="${this.plotContainer}">
  <svg id="${this.chartSVGid}"></svg>
  </div>  
  <svg id="${this.chartSVGidFoot}"></svg>
  `

  this._container.append(containerContent);      

	$(`#${this.opt.target}-progressbar`).progressbar({
		value:false
	});
			
  jQuery( '#' + this.opt.target + '_save_data' ).on('click', function(evt) {
    self.saveRenderedData(self, false);
  });

  jQuery( '#' + this.opt.target + '_save_raw_data' ).on('click', function(evt) {
    self.saveRawData(self);
  });

  jQuery( '#' + this.opt.target + '_restore_defaults' ).on('click', function(evt) {
    self.restoreDefaults();
  });

  jQuery( '#' + this.opt.target + '_log2' ).
   on('change', function(evt) {
    self.opt.calculateLog = this.checked;
    self.refresh();
    self._storeValue('calculateLog',this.checked);
  });


  jQuery( '#' + this.opt.target + '_showHomoeologues' ).
   on('change', function(evt) {

    if(self.opt.showTernaryPlot){
      $(`#${self.opt.target}_showTernaryPlot`).prop('checked', false);
      self._storeValue('showTernaryPlot',false);
      self.opt.showTernaryPlot = false;      
      self.opt.plot = "Bar";
    }    

    self.opt.showHomoeologues = this.checked;    
    if(typeof self.opt.sortOrder !== 'undefined'){
      self.refresh();
    }

    self._storeValue('showHomoeologues',this.checked);
    self.refreshSVG();
  });


  $(`#${this.opt.target}_showTernaryPlot`)
    .on('change', function(evt){

      $( '#' + self.opt.target + '_showHomoeologues' ).prop('checked', false);
      self._storeValue('showHomoeologues',false);
      
      self.opt.showTernaryPlot = this.checked;
      if(self.opt.showTernaryPlot){
        self.opt.showHomoeologues = true;   // For the homoeologues data to be calculated        
        self.opt.plot = "Ternary";        
      } else {        
        self.opt.showHomoeologues = false;      
        self.opt.plot = "Bar";        
      }      

      if(typeof self.opt.sortOrder !== 'undefined'){
        self.refresh();
      }      

      self._storeValue('showTernaryPlot',this.checked);
      self.refreshSVG();
  });    

	$(`#bar_expression_viewer_ternSpan`).css('display', 'none');

  this.renderChartScale();

  this.adjustWidth();

  this.adjustHeight(this.opt.height);

};

ExpressionBar.prototype.setDefaultOptions = function(){
  this.opt = {
   target: 'bar_expression_viewer',
   fontFamily: 'Andale mono, courier, monospace',
   fontColor: 'white',
   backgroundColor: 'white',
   selectionFontColor: 'black',
   selectionBackgroundColor: 'yellow',
   width: $(window).width(),
   height: $(window).height(),
   barHeight: 17,
   labelWidth: ($(window).width() * 0.4),
   renderProperty: 'tpm',
   renderGroup: 'group',
   defaultLog2State: false,
   restoreDisplayOptions: true,
   highlight: null,
   groupBy: 'groups',
   groupBarWidth: 18,
   colorFactor: 'renderGroup',
   headerOffset: 0,
   showHomoeologues: false,
   plot:'Bar',
   fontSize: 14,
   tpmThreshold: 1
  };}

ExpressionBar.prototype.setSelectedInJoinForm = function() {

  var self = this;
  var groupByValue = this.opt.groupBy;
  if (groupByValue.constructor === Array) {
    for(var i in groupByValue){
      var toSearch = groupByValue[i].replace(/ /g, '_')
      jQuery(this.joinForm)
      .find('[name=factor][value=' + toSearch +']')
      .prop('checked',true);

    }
    groupByValue = 'factors';
  }
  jQuery(this.joinForm)
  .find('[name=showHomoeologues][value=show]')
  .prop('checked', this.opt.showHomoeologues).
  on('change', function(evt) {
    self.opt.showHomoeologues = this.checked;
  });

  jQuery(this.joinForm)
  .find('[name=group][value=' + groupByValue +']')
  .prop('checked',true);

  jQuery(this.joinForm)
  .find('[name=group]')
  .on('change', function(){self.toggleFactorCheckbox(self)});
};



//Returns if we need to update the page or not.
ExpressionBar.prototype.updateGroupBy = function(self) {
  var oldGroupBy = self.opt.groupBy;
  var ret = true;
  if(self.showFactors  == true){
    var facts = [];
    for(var fo in self.data.defaultFactorOrder){
      i = self.data.defaultFactorOrder[fo];
      var name=self.opt.target + '_sorted_list_'+ i.split(' ').join('_');
      var shbtn = jQuery('#showHide_' + name);
      if(shbtn.data('selected')){
        facts.push(shbtn.data('factor'));
      }
    }

    self.opt.groupBy = facts;

    if(facts.length == 0){
      self.opt.groupBy = 'ungrouped';
      ret = false;
    }
  }else{
    //self.opt.groupBy = selectedCheckbox.val();
    ret = false;
  }
  if(oldGroupBy == self.opt.groupBy){
    ret = false;
  }
  if(ret){
    //sessionStorage.setItem( this.opt.target + 'groupBy' , self.opt.groupBy);
    this._storeValue('groupBy', self.opt.groupBy);
  }


  return ret;
};

ExpressionBar.prototype.setDefaultExpressionValue = function(){
  var def = this.data.getDefaultProperty();
  this._storeValue('renderProperty', def);
  this.restoreDisplayOptions();

};

ExpressionBar.prototype.refreshSVG = function() {
  var chart=this.chart;  
  chart.selectAll('*').remove();  
  this.data.renderedData = [];
  if(! this.data.hasExpressionValue(this.opt.renderProperty)){
    this.setDefaultExpressionValue();
  }
  this.render();
  this.hideHidelightRow();
  this.data.sortRenderedGroups();
  this.refresh();
};


ExpressionBar.prototype.createInitialSessionStorage = function(){

  var thisChart = this;

  d3.json(this.opt.data, function(error, json) {
    if (error) {
      console.warn(error);
      return;
    }

    self.data = new dataContainer.ExpressionData(json, self.opt);

    thisChart._storeValue('selectedFactors', self.data.selectedFactors);
    thisChart._storeValue('groupBy', thisChart.opt.groupBy);
    thisChart.updateGroupBy(thisChart);
    thisChart.refresh();
  });
}


ExpressionBar.prototype._updateFilteredFactors = function(sortDivId){

  //This may not work when we have more than`
  //checks = jQuery(":checkbox[id*='|']");
  var toSearch='#'+ sortDivId +' input:checkbox';
  this.refreshSVGEnabled = false;

  jQuery(toSearch).each(function() {
    src = jQuery(this);
    self = src.data('expression-bar');
    factor = src.data('factor');
    value = src.data('value');
    self.data.selectedFactors[factor][value] = this.checked;
  });
  this._storeValue('selectedFactors', this.data.selectedFactors);
  this.refreshSVGEnabled = true;

};

ExpressionBar.prototype.toggleFactorCheckbox = function(shbtn){
 //var shbtn = jQuery('#showHide_' + name);
 var selected = shbtn.data('selected');
 // shbtn
 if(selected){
  shbtn.data('selected', false);
  shbtn.removeClass('ui-icon-circle-minus');
  shbtn.addClass('ui-icon-circle-plus');
}else{
  shbtn.data('selected', true);
  shbtn.removeClass('ui-icon-circle-plus');
  shbtn.addClass('ui-icon-circle-minus');
}
};


ExpressionBar.prototype._storeValue = function(key, value){
  var val = JSON.stringify(value);
  sessionStorage.setItem(this.opt.target + "_" + key, val);
};

ExpressionBar.prototype._removeValue = function(key, value){
  sessionStorage.removeItem(this.opt.target + "_" + key);
  this.opt[key] = null;
};

ExpressionBar.prototype._retrieveValue = function(key){
  var val = sessionStorage.getItem(this.opt.target + "_" + key);
  var parsed = null;
  try {
    parsed = JSON.parse(val);
  }catch(err){
    parsed = null;
  }
  return parsed;
};


ExpressionBar.prototype.checkSelectedFactors = function(){
  var self = this;
  for(var fo in this.data.defaultFactorOrder){
    i = this.data.defaultFactorOrder[fo];
    var name=this.opt.target + '_sorted_list_'+ i.split(' ').join('_');
    var shbtn = jQuery('#showHide_' + name);
    var groupByValue = this.opt.groupBy;

    shbtn.data('selected', false);
    shbtn.data('factor', i);
    shbtn.on('click', function(evt){
     target = jQuery(this);

     self.toggleFactorCheckbox(target);
     self.updateGroupBy(self);
     self.refreshSVG();
     self.data.sortRenderedGroups();
     self.refresh();
   });

    if (groupByValue.constructor === Array) {
      index = self.opt.groupBy.indexOf(i)
      self.showFactors = true;
      if(index < 0 ){
        if(shbtn.hasClass('ui-icon-circle-minus')){
          shbtn.removeClass('ui-icon-circle-minus');
          shbtn.addClass('ui-icon-circle-plus');
        }
      }else{
        if(shbtn.hasClass('ui-icon-circle-plus')){
          shbtn.removeClass('ui-icon-circle-plus');
          shbtn.addClass('ui-icon-circle-minus');
        }
        shbtn.data('selected', true);
      }
    }else{
      if(shbtn.hasClass('ui-icon-circle-plus')){
        shbtn.removeClass('ui-icon-circle-plus');
        shbtn.addClass('ui-icon-circle-minus');
      }
    }
  }
};


ExpressionBar.prototype.renderSortWindow = function(){
  var self = this;
  var selectedFactors = this.data.selectedFactors;

  if(typeof this.opt.selectedFactors !== 'undefined' ){
    selectedFactors = this.opt.selectedFactors;
  }

  var listText = ''

  var factorCount = 0;

  for(fo in this.data.defaultFactorOrder){
    var i = this.data.defaultFactorOrder[fo];
    factorCount ++;
    var orderedKeys = this.data.getSortedKeys(fo);
    name=this.opt.target + '_sorted_list_'+ i.split(' ').join('_');

    listText += '<div class="' + this.opt.target + '_factor">';
    listText += '<span id="span_' +
    name + '" class="ui-icon  ui-icon-arrowthick-2-n-s" title="Filter/reorder" ></span><br>'
    listText += '<span id="showHide_' + name + '" class="ui-icon  ui-icon-circle-plus"\
    title="Display/Hide Category"  ></span>'

    listText += '<div id="dialog_' + name + '"  \
    style="z-index:3; overflow:auto; min-width:250px; max-height:' + this.opt.height/2 +'px" >' ;

    listText += '<div id="all_' + name + '"  onmouseover="this.style.cursor=\'pointer\';">all</div>';
    listText += '<div id="none_' + name +'"  onmouseover="this.style.cursor=\'pointer\';">none</div>';
    listText += '<div id="div_' + name + '">' ;
    listText += '<form id="' + name +'">';

    // Forms for each facor to select displayed data
    //console.log(name);
    for(j in orderedKeys){
      var bgcolor = this.factorColors[i][orderedKeys[j]];
      var longFactorName = this.data.longFactorName[i][orderedKeys[j]];
      var shortId = i.split(' ').join('_') + '|' + orderedKeys[j];
      var checked = '';
      if(selectedFactors[i][orderedKeys[j]]){
        checked = 'checked';
      }

      listText += '<div \
      id="' + this.opt.target + '_sorted_position:' + shortId +'" \
      style="background-color:' + bgcolor + '" \
      height="'+this.opt.barHeight+ 'px" \
      data-factor="'+ i +'" \
      data-value="' + orderedKeys[j] +'" \
      title="' + longFactorName +'"\
      >' ;
      var toDisplay = longFactorName.length > 40 ?  orderedKeys[j] : longFactorName;
      listText += '<input type="checkbox" id="' +shortId+'" \
      name="' +  shortId + '" \
      data-factor="'+ i +'" \
      data-value="' + orderedKeys[j] +'" \
      ' + checked + '/>';
      listText +=   toDisplay + '</div>'  ;

    }
    listText += '</form>' ;
    listText += "</div>" ;
    listText += "</div>" ;
    listText += "</div>" ;
  }

  this.sortDiv = jQuery('#'+this.sortDivId);
  this.sortDiv.tooltip({
    track: true
  });

  this.sortDiv.html(listText);
  //this.sortDiv.css('column-count',factorCount);
  //this.sortDiv.css('height',factorCount * this.opt.barHeight *2);

  this.sortDiv.disableSelection();
  checks = jQuery(":checkbox[id*='|']");

  checks.click(function(evt){
    var src = jQuery(this);
    var self2 = src.data('expression-bar');
    self2._updateFilteredFactors(self2.sortDivId);
    if(self2.refreshSVGEnabled == true){
      self2.updateGroupBy(self2);
      self2.refreshSVG(self2);
      self2.data.sortRenderedGroups();
      self2.refresh();
    }
  });

  // icons stylings
  checks.data("expression-bar", this);
  var xFact = 0;
  for(var fo in this.data.defaultFactorOrder){
    i = this.data.defaultFactorOrder[fo]
    var name=this.opt.target + '_sorted_list_'+ i.split(' ').join('_');
    jQuery('#span_' + name).on("click", function(e){
      var nameinside = e.target.id.replace("span_", "dialog_")
      var sdialog = jQuery('#'+nameinside);
      sdialog.show();
      jQuery(document).mouseup(function (e){
        var container = sdialog;
      if (!container.is(e.target) // if the target of the click isn't the container...
          && container.has(e.target).length === 0) // ... nor a descendant of the container
      {
        container.hide();
      }
    });

    });

    var s = jQuery('#'+ name);
    var factorDiv = jQuery('.' + this.opt.target + '_factor');
    var sbtn = jQuery('#span_' + name);
    var shbtn = jQuery('#showHide_' + name);
    var sdialog = jQuery('#dialog_' + name);
    var count = s.children().length;
    var sall = jQuery('#all_'+ name);
    var snone = jQuery('#none_'+ name);

    $('#' + this.opt.target).css('overflow','hidden');

    $('.ui-icon').css('margin',0);

    var iconWidth = factorDiv.width();
    factorDiv.css('display','inline-block');
    factorDiv.css('text-align','center');
    factorDiv.css('width',16);
    factorDiv.css('margin-left',2);

    sall.on('click', function(e){
      var nameinside = e.target.id.replace('all_', '');
      self.selectAllorNoneFactor(nameinside, true);

    });

    snone.on('click', function(e){
      var nameinside = e.target.id.replace('none_', '');
      self.selectAllorNoneFactor(nameinside, false);

    });

    s.css('text-align', 'left');
    s.css('max-width','100%;')
    s.css('overflow-x','hidden;')
    s.sortable({
      axis: "y",
      update: function(event, ui) {
        var factor = ui.item.data('factor');
        var value  = ui.item.data('value');
        var index  = ui.item.index();
        self._refershSortedOrder(factor);
      }
    });

    sbtn.attr('width', this.opt.barHeight    * 2 );
    sbtn.attr('height', this.opt.barHeight );

    var possbtn = sbtn.position();

    shbtn.attr('width', this.opt.barHeight    * 2 );
    shbtn.attr('height', this.opt.barHeight );

    sdialog.css('position', 'absolute');
    sdialog.css('left', xFact );
    sdialog.css('background-color', 'white');
    sdialog.css('border', 'outset');
    s.disableSelection();
    sdialog.hide();

    //sdialog.on("mouseleave", function(){sdialog.hide()})

    xFact += self.opt.groupBarWidth;
  }

};

ExpressionBar.prototype.selectAllorNoneFactor = function(nameInside, value){
  var self = this;
      jQuery('#'+ nameInside +' input:checkbox').each(function() {
        jQuery(this).prop( 'checked', value ); // do your staff with each checkbox
        self._updateFilteredFactors(self.sortDivId );

      });
      if(self.refreshSVGEnabled == true){
        self.updateGroupBy(self);
        self.refreshSVG(self);
      }
    }

ExpressionBar.prototype._refershSortedOrder = function(factor){
  var self = this;

  var find = factor.replace(/ /g, '_');
  var name=this.opt.target + '_sorted_list_'+ find;
  jQuery('#'+ name  + ' div').each(function(e) {
    div = jQuery(this);
    var factor = div.data('factor');
    var value  = div.data('value');
    self.data.renderedOrder[factor][value] = div.index();
  }
  );
  this.data.addSortPriority(factor, false);
  this._storeValue('sortOrder', this.data.sortOrder);
  this._storeValue('renderedOrder', this.renderedOrder);

  this.data.sortRenderedGroups(this.data.sortOrder, this.renderedOrder);
  this.setFactorColor(factor);
  this.refresh();
};

ExpressionBar.prototype.showHighlightedFactors = function(toShow, evt){
  //console.log("TADA!");

  //console.log(evt);
  var factorNames = this.data.longFactorName;
  var self = this;
  for(key in toShow.factors){

    var value = toShow.factors[key];

    var escaped_key = key.replace(/ /g, '_');
    var label_div_id = self.opt.target + '_factor_label_' + escaped_key;
    var colour_div_id = self.opt.target + '_factor_colour_' + escaped_key;
    var label_full_div_id = self.opt.target + '_factor_full_label_' + escaped_key;

    var long_name = factorNames[key][value];
    var colour = self.factorColors[key][value];
    if(long_name.length > 28){
      long_name = value;
    }
    jQuery('#' + label_div_id).text(long_name);
    jQuery('#' + colour_div_id).css('background-color', colour);
    jQuery('#' + label_full_div_id).show();
  }

};

ExpressionBar.prototype.hideHighlightedFactors = function(){
  var self = this;
  this.data.factors.forEach(function(value, key, map){
    var escaped_key = key.replace(/ /g, '_');
    var label_full_div_id = self.opt.target + '_factor_full_label_' + escaped_key;
    jQuery('#'+label_full_div_id).hide();
  });
};

ExpressionBar.prototype.renderPropertySelector = function(){
  var self = this;
  var groupOptions = this.data.getExpressionValueTypes();

  self.propertySelector
  .find('option')
  .remove();

  for(i in groupOptions){
    var key = groupOptions[i];
    self.propertySelector
    .append(jQuery('<option></option>')
      .attr('value',key)
      .text(key));
  }


  this.propertySelector.val(this.opt.renderProperty);
  this.propertySelector.on('change', function(event) {
   self.opt.renderProperty  = self.propertySelector.find(':selected').text();      
   self._storeValue('renderProperty', self.opt.renderProperty);
   self.refresh();
  });

};

ExpressionBar.prototype.renderGroupSelectorColour = function(){
 var self = this;
 var groupOptions = {'study':'study', 'group':'group'};
 jQuery.each(groupOptions, function(key,value) {
   self.groupSelectorColour
   .append(jQuery('<option></option>')
    .attr('value',key)
    .text(value));
 });
 this.groupSelectorColour.val(this.opt.renderGroup);

 this.groupSelectorColour.on('change', function(event) {
   self.opt.renderGroup  = self.groupSelectorColour.find(':selected').text();;
   self.refresh();
 } );

};

ExpressionBar.prototype.saveRenderedPNG = function(){
  var svgData = this.prepareSVGForSaving();

  var canvas = document.createElement( 'canvas' );
  var scaleBy = 4;
  canvas.height = scaleBy * ( this.opt.headerOffset + 20 + this.totalHeight );
  canvas.width = scaleBy *  this.opt.width;
  var ctx = canvas.getContext( '2d' );
  var img = new Image();  

  //img.width = this.opt.width * scaleBy;
  //img.height = (this.opt.headerOffset + 20 + this.totalHeight) * scaleBy ;
  img.src = "data:image/svg+xml;base64," + btoa( svgData );
  img.style='width:100%'
  
  img.onload = function() {    
    ctx.drawImage(img, 0, 0, canvas.width , canvas.height);
    var canvasdata = canvas.toDataURL('image/png');
    var a = document.createElement('a');
    a.download = 'expVIP_'+Date.now()+'.png';
    a.href = canvasdata;
    document.body.appendChild(a);
    a.click();    
  };
};

ExpressionBar.prototype.prepareSVGForSaving = function(){

   var svgHead = document.getElementById(this.chartSVGidHead);
   var svg = document.getElementById(this.chartSVGid);
   var svgFoot = document.getElementById(this.chartSVGidFoot);
  //get svg source.


  var headHeight = svgHead.height.baseVal.value;
  var footHeight = headHeight + svg.height.baseVal.value;

  var serializer = new XMLSerializer();
  var sourceHead = serializer.serializeToString(svgHead);
  var sourceMain = serializer.serializeToString(svg);  
  var sourceFoot = serializer.serializeToString(svgFoot);
  var svg_width  = this.opt.width;
  var svg_height = this.opt.headerOffset + 60 + this.totalHeight ;


  sourceMain = sourceMain.replace(/^<svg/, '<svg y="' + headHeight + '" ');
  sourceFoot = sourceFoot.replace(/^<svg/, '<svg y="' + footHeight + '" ');
  var source = '<svg xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg" \
  font-family="' + this.opt.fontFamily + '" font-size="' + this.opt.barHeight + 'px" \
  width="'+ svg_width  +'px" height="' + svg_height   + 'px" \
  viewbox="0 0 ' + svg_width + ' '   + svg_height + '">'

  source += sourceHead;
  source += sourceMain;  
  source += sourceFoot;
  source += '</svg>'
  //add xml declaration
  source = '<?xml version="1.0" standalone="no"?>\r\n' + source;

  return source;
};

ExpressionBar.prototype._saveFactorsInOutput = function(selectedFactors, factorNames, output){
		for(fact in selectedFactors){
					// console.log(fact);
					output += fact + "\t"
					vals = selectedFactors[fact];
					var curr_fact = factorNames[fact];
					for(v in vals){
						if(vals[v]){

								curr_long = curr_fact[v];
								output +=  curr_long + ", ";
						}
				}
				output += "\n";
		}
		return output;

};

ExpressionBar.prototype._generateFileName = function(renderedProperty, toSave, isRawData){
  var fileName = renderedProperty;
  
  for(var gene in toSave ){

    if(Object.keys(toSave).length > 3){
      var date = `${new Date().getDate()}_${new Date().getMonth() + 1}_${new Date().getFullYear()}`;      
      fileName = `heatmap_${date}_${renderedProperty}`;
    } else {        
      fileName += '_' + toSave[gene][0].gene;
    }    

  }  

  fileName += isRawData ? '_raw':'';

  return fileName += ".tsv"
}

ExpressionBar.prototype.saveRenderedData = function(self){
  var toSave = self.data.renderedData;
  var selectedFactors = self.data.selectedFactors;
  var output = '';
  var factorNames = this.data.longFactorName;
	var renderedProperty = self.opt.renderProperty ;
  var fileName = '';
		
  // Printing all the factors used
 	output = this._saveFactorsInOutput(selectedFactors, factorNames, output);

  // Printing the headers
	output += "\t";
	for(gene in toSave ){
			output += renderedProperty + "\t" + "SEM" + "\t";
	}
	
  // Printing the gene name
  for(var gene in toSave ){
    output += toSave[gene][0].gene + "\t" + toSave[gene][0].gene + "\t";  
  }   

	output += "\n";

  // Printing the factors, value and SD
	var total = toSave[0].length
	for(var i = 0; i < total; i++){
			var name = toSave[0][i].name
			if(toSave[0][i].longDescription){
					name = toSave[0][i].longDescription
			}
			output +=  name + "(n=" + toSave[0][i].data.length  + ")\t";

			for(gene in toSave ){    
					output += toSave[gene][i].value + "\t" + toSave[gene][i].stdev + "\t";
			}
			output += "\n";
	}

  // Generating the fileName
  fileName = this._generateFileName(renderedProperty, toSave, false);

	self.saveTextFile(fileName, output);
};

ExpressionBar.prototype.saveRawData = function(self){
		var allData = self.data;
		var toSave = self.data.renderedData;
		var selectedFactors = self.data.selectedFactors;
		var output = '';
		var factorNames = this.data.longFactorName;
		var renderedProperty = self.opt.renderProperty ;
		var valueObject = allData.values;
		var fileName = "";
		var defaultFactorOrder = allData.defaultFactorOrder;		
		
		// Printing all the factors used
		output = this._saveFactorsInOutput(selectedFactors, factorNames, output);
		
		// Printing the headers
		output += "\n" + renderedProperty;
		output += "\nExperiments";
		
		// Print the factor headers
		for(var factor in defaultFactorOrder){
			output += "\t" + defaultFactorOrder[factor];
		}	

		// printing the gene name
		for(var gene in valueObject){
			output += "\t" + gene;
		}			
		
		// Printing the experiments, factors and value
		for(var data in allData.groups){
			var factors = allData.groups[data].factors
			output += "\n" + allData.groups[data].name;
			for(var factor in defaultFactorOrder){
				output += "\t" + factors[defaultFactorOrder[factor]];
			}
			for(var gene in valueObject){
				var value = 0;
				// There is a 61 gap between group 240 and 302 (puts 0 instead)
				if(typeof valueObject[gene][renderedProperty][data] !== 'undefined'){
					value = valueObject[gene][renderedProperty][data].value;
				}
				output += "\t" + value;
			}
		}

		// Generating the fileName
    fileName = this._generateFileName(renderedProperty, toSave, true);

		// Saving the generated file
		self.saveTextFile(fileName, output);

};

ExpressionBar.prototype.saveRenderedSVG = function(){
  var source = this.prepareSVGForSaving();
  //convert svg source to URI data scheme.
  var url = 'data:image/svg+xml;charset=utf-8,'+ encodeURIComponent(source);

  var pom = document.createElement('a');
  pom.href = url;
  pom.setAttribute('download', 'expVIP_'+Date.now()+'plot.svg');
  if (document.createEvent) {
    var event = document.createEvent('MouseEvents');
    event.initEvent('click', true, true);
    pom.dispatchEvent(event);
  }
  else {
    console.log("Create event not working");
  }
  if(pom.parentElement){
    pom.parentElement.removeChild(pom);
  }
};


/**
 * Sets a Map with the available factors and the values from the json
 * response.
 */
ExpressionBar.prototype.setAvailableFactors = function(){
   this.data.setAvailableFactors();
 };

ExpressionBar.prototype.loadExpression = function(url) {
  if (typeof url === 'undefined') {
    return ;
  }
  var self = this;
  self.pb.show();

  
    d3.json(url, function(error, json) {      
      try{

      self.data = new dataContainer.ExpressionData(json, self.opt);

      if(typeof self.data.compare === 'undefined'){
        self.data.compare = '';
      }      

      if(typeof sessionStorage.bar_expression_viewer_selectedFactors === 'undefined'){
        self.createInitialSessionStorage();
      }

			// If the data provided of the key "tern" and it's a 3 homoeolougy gene, add the ternary plot option checkbox			
      if(typeof json.tern !== 'undefined'){
        self._hasTernKey(json.values, json.tern);
      } else {
        self._storeValue('showTernaryPlot',false);
      }
    
      } catch(err){
        alert ('Data couldn\'t be loaded');
        console.error(err);
        if(typeof $(`#bar_expression_viewer-progressbar`) !== 'undefined'){
          $(`#bar_expression_viewer-progressbar`).hide();
        }
			}
			
			self.pb.hide();
      self.dataLoaded();

    });  
  
};


ExpressionBar.prototype.isFactorPresent = function(factor) {
  var renderedData = this.data.renderedData;
  var globalFactors = this.factors;
  if(this.opt.groupBy == 'ungrouped' || this.opt.groupBy === 'groups' ){
    //We need to add a better decision here. M
    return true;
  }else{
    return jQuery.inArray(factor, this.opt.groupBy) > -1;
  }
};

ExpressionBar.prototype.getDefaultColour = function(){
  return this.opt.groupBy[0];
};

ExpressionBar.prototype.refreshBar = function(gene, i){
  this.renderObject.refreshBar(gene,i)
};

ExpressionBar.prototype.refreshScale = function(){
  this.renderObject.refreshScale();
};

ExpressionBar.prototype.refresh = function(){
  var chart=this.chart;
  this.data.renderedData = this.data.getGroupedData(this.opt.renderProperty,this.opt.groupBy);
  this.totalRenderedGenes = this.data.renderedData.length;

  this.x = this.renderObject.rangeX();


  var gene = this.opt.highlight;
  for (var i in  this.data.renderedData) {
    this.refreshBar(gene, i);
  };
  this.refreshTitles();
  this.refreshScale();

  if(this.opt.plot === "Ternary"){    
    this.renderObject.renderGeneBar(0);
  }
};


ExpressionBar.prototype.maxInData = function(){
  return this.data.max;
};

ExpressionBar.prototype.prepareColorsForFactors = function(){
  //this.factorColors = Map.new();
  this.factorColors = this.data.prepareColorsForFactors();
};

ExpressionBar.prototype.refreshTitles = function(){
  var barHeight = this.opt.barHeight;
  var titleGroupSpace = this.opt.titleGroupSpace;
  var arr = this.data.renderedData[0];
  var factorLength = this.data.factors.size;
  this.titleGroup.selectAll('rect').transition().duration(1000)//.ease("cubic-in-out")
  .attr('y', function(d,i){

    var groupIndex = Math.floor(i/factorLength);
    var pos = arr[groupIndex].renderIndex;
    return pos  * barHeight;
  });

  this.titleGroup.selectAll('text').transition().duration(1000)//.ease("cubic-in-out")
  .attr('y', function(d,i){

   var pos = arr[i].renderIndex;
   return (pos* barHeight) + barHeight/1.5;
 });

};

ExpressionBar.prototype.calculateBarWidth = function(){
  return this.renderObject.calculateBarWidth();
};

ExpressionBar.prototype.renderGeneTitles = function(i){
  var data = this.data.renderedData;
  var dat = data[i];
  if (typeof dat === 'undefined') {
    return ;
  }
  if (typeof dat[0] === 'undefined') {
    return ;
  }
  var render_width = this.calculateBarWidth();
  var barHeight = this.opt.barHeight;
  var fontSize = this.opt.fontSize;
  var labelWidth = this.opt.labelWidth;
  var x=this.x;
  var sc = this.opt.sc;
  var blockWidth = (this.opt.width - this.opt.labelWidth) / this.totalRenderedGenes;
  var gXOffset = (blockWidth * i) + labelWidth;
  bar = this.factorTitle.append('g');
  bar.attr('transform', 'translate(' + gXOffset  + ',0)');
  var gene = dat[0].gene;
  var weight = 100;
  var decoration = ''
  if(gene == this.data.gene){
    weight = 900;
    decoration = 'underline';
  }


  var geneText = bar.append('text')
  .attr('x',0)
  .attr('y',-5)
  //.attr('dx', '.35em')
  .attr('width', blockWidth)
  .attr('height', barHeight)
  //.attr('font-weight',weight)
  .attr('text-align', 'left')
  .attr('text-decoration', decoration)
  .text(gene);
  var renderedTextWidth = geneText.node().getBBox().width;
  var renderedTextHeight = geneText.node().getBBox().height;
  // console.log(`BAR HEIGHT: ${barHeight}`);
  var rotated = false;
  var newHeight = barHeight;
  if(renderedTextWidth > blockWidth){
    rotated = true;
    geneText.attr('transform', 'rotate(270)')
    .attr('dy', '1.0em')
  }

  // if(rotated && renderedTextWidth > this.opt.headerOffset){
  //   newHeight =  0.75 * this.opt.barHeight * (this.opt.headerOffset/renderedTextWidth);
  // }

  // THIS BE PATCH
  if(rotated){
    newHeight =  0.75 * this.opt.barHeight * (this.opt.headerOffset/renderedTextWidth);
  }

  // if(renderedTextHeight > blockWidth ){
  //   newHeight =  this.opt.barHeight * ( blockWidth/ renderedTextHeight );
  //   geneText.attr('dy', '0.55em');
  // }

    geneText.style('font-size', newHeight  + 'px') ;

};




ExpressionBar.prototype.renderFactorTitles = function(){
  this.factorTitle = this.chartHead.append('g');


  var barHeight = this.opt.barHeight;
  var xFact = 0;
  var self = this;
  var longestFactorTitle = 0;
  this.data.factors.forEach(function(value, key, map){
    var factorTitle = self.factorTitle.append('text')
    .attr('y', xFact)
    .attr('dy', '1em')
    .attr('transform', function(d) {
      return 'rotate(-90)'
    })
    .text(key);
    xFact += self.opt.groupBarWidth;

    // Calculating the longest factor title
    var factorTitleWidth = factorTitle.node().getBBox().width;
    if(factorTitleWidth > longestFactorTitle){
      longestFactorTitle = factorTitleWidth;
    }
  });

  if(longestFactorTitle > this.opt.headerOffset){
    this.opt.headerOffset = longestFactorTitle ;
  }
};

ExpressionBar.prototype.getTitleSetOffset = function(){
  return this.data.factors.size  * this.opt.groupBarWidth;
};

ExpressionBar.prototype.getTitleFactorWidth = function(){
  return this.opt.labelWidth - this.getTitleSetOffset();
};

ExpressionBar.prototype.renderTitles = function(){
  var barHeight = this.opt.barHeight
  var self = this;
  var headerOffset = 0;
  this.titleGroup = this.chart.append('g').attr('id', 'conditions');
  this.titleGroup.attr('transform', 'translate(0,' + barHeight + ')');
  arr = this.data.renderedData[0];
  var titleSetOffset = this.getTitleSetOffset();
  var factorWidth = this.opt.groupBarWidth - 2;
  for(i in arr){

    var pos = arr[i].renderIndex ;
    this.titleGroup.append('text')
    .style('cursor', 'pointer')
    .attr('x',titleSetOffset)
    .attr('y', (((pos + 1 ) * barHeight)) + headerOffset)
    .attr('dx', '.35em')
    .attr('height', barHeight)
    .on('click', function(){
      self.setFactorColor('renderGroup')
    })
    .text(arr[i].name + ' (n=' + arr[i].data.length +  ')');
    var xFact = 0;
    this.data.factors.forEach(function(value, key, map){
      var factorValue = arr[i].factors[key];

      var factorLongName = self.data.longFactorName[key][factorValue];
      var color = self.factorColors[key][factorValue];
      var tooltip = key + ': ' + factorLongName;
      var rect = self.titleGroup.append('rect')
      .attr('x', xFact)
      .attr('y', (pos * barHeight) + headerOffset )
      .attr('height', barHeight - 2)
      .attr('fill', color)
      .attr('width', factorWidth)
      .attr('opacity', 0.0);

      if(typeof factorValue !== 'undefined'){
        rect.on('mouseenter', function(){self.showTooltip(tooltip, this, this.tooltip, this.tooltipBox, false)})
        .on('click', function(){
          self.data.addSortPriority(key, false);
          self._storeValue('sortOrder', self.data.sortOrder);
          self.data.sortRenderedGroups();
          self.setFactorColor(key);
          self.refresh();
        })
        .on('mouseleave', function(){self.hideTooltip()});
        rect.attr('opacity', 1.0);
      }

      xFact += self.opt.groupBarWidth;
    });
  }

  // Calculating the gap between the bars and the groups and titles
  var groupWidth = this.titleGroup.node().getBBox().width;
  this.opt.labelWidth = groupWidth + 20;
};

ExpressionBar.prototype.setFactorColor = function(factor){
  this.opt.colorFactor = factor;
  this._storeValue('colorFactor', factor);
};

ExpressionBar.prototype.renderTooltip = function(){
  var barHeight = this.opt.barHeight;
  var fontSize = this.opt.fontSize;
  this.tooltipBox = this.chart.append('rect').attr('id', 'toolTipRect');
  this.tooltip = this.chart.append('text').attr('id', 'toolTipText');
  this.tooltip.attr('x',0)
  .attr('y', 0)
  .attr('height', barHeight -2)
  .attr('fill', 'white')
  .attr('font-size', fontSize/1.4)
  .attr('visibility', 'hidden')
};

ExpressionBar.prototype.renderSelection = function(){
  var barHeight = this.opt.barHeight;
  var fontSize = this.opt.fontSize;
  this.selectionBox = this.chart.append('rect')
  .attr('y', 10)
  .attr('height', barHeight )
  .attr('width', this.opt.width)
  .attr('fill', 'lightgray')
  .attr('font-size', fontSize);

  var selectionWidth = this.calculateBarWidth();
  this.selectionBoxGene = this.chart.append('rect')
  .attr('y', 0)
  .attr('height', this.totalHeight  )
  .attr('width', selectionWidth)
  .attr('fill', 'lightgray');


  this.selectionBoxTitles = this.chartHead.append('g');
  selectionboxHighlight = this.selectionBoxTitles.append('rect')
  .attr('y', 0)
  .attr('height', this.opt.headerOffset)
  .attr('width', selectionWidth)
  .attr('fill', 'lightgray');
};

ExpressionBar.prototype.highlightRow = function(target){
  var barHeight = this.opt.barHeight;

  if(typeof this.data === 'undefined'){
    return;
  }
  if(typeof this.data.renderedData === 'undefined'){
    return;
  }
  if(typeof this.data.renderedData[0] === 'undefined'){
    return;
  }
  if(typeof this.selectionBox === 'undefined'){
    return;
  }
  var d3SVG = d3.select(target);
  var mouse = d3.mouse(target);
  var index = 0;
  index = Math.floor(mouse[1]/(barHeight));

  if(index == 0){
    index = 1;
  }
  var elements = this.data.renderedData[0].length;
  if(index > elements ){
    index = elements;
  }

  var pos = index * barHeight;
  this.selectionBox.attr('y', pos);

  var labelWidth = this.opt.labelWidth;
  var localPos = Math.floor(mouse[0]) - this.opt.labelWidth;
  var pos2;
  if(localPos > 0){
    var blockWidth = (this.opt.width - this.opt.labelWidth) / this.data.renderedData.length;
    var index2 = Math.floor(localPos/blockWidth);
    pos2=(index2 * blockWidth) + this.opt.labelWidth;
  }else{
    pos2 = 0 - this.opt.labelWidth;

  }
  this.selectionBoxGene.attr('x', pos2);
  this.selectionBoxTitles.attr('transform', 'translate('+pos2+',0)');
}

ExpressionBar.prototype.showHighithRow = function(){
      
  if(typeof this.selectionBox !== 'undefined'){

    if(this.opt.plot === "Ternary"){    // If it's a ternary plot only highlight the conditions
      return 0;      
    }

    this.selectionBox.attr('visibility', 'visible');
    if(this.opt.plot == 'HeatMap'){
      this.selectionBoxGene.attr('visibility', 'visible');
      this.selectionBoxTitles.attr('display', 'inline');
    }
  }

}

ExpressionBar.prototype.hideHidelightRow = function(){
  if(typeof this.selectionBox !== 'undefined'){
    this.selectionBox .attr('visibility', 'hidden');
    this.selectionBoxGene.attr('visibility', 'hidden');
    this.selectionBoxTitles.attr('display', 'none');
  }
}


ExpressionBar.prototype.showTooltip = function(mouseovertext, evt, tooltip, tooltipBox, expressionBiasBlock) {  
  // var tooltip = this.tooltip;  
  var x=0, y=0;  
  var svgPosition = d3.select(evt).position(this);    
  var svg1 = document.getElementById(this.chartSVGid);
  var bBox = svg1.getBBox();
  var max =  bBox.height - this.opt.barHeight;
  var match = /\r|\n/.exec(mouseovertext);
  var textBox;  
  var maxTextBoxWidth = 0;
  var availableWidth = this.opt.width - this.opt.labelWidth;
  var widthPerBar = (availableWidth / this.totalRenderedGenes );

  if(this.opt.plot != "Ternary"){
    x = svgPosition.left + widthPerBar;
  } else {
    x = svgPosition.left + 25;
  }

  expressionBiasBlock ? y = svgPosition.top - 20 : y = svgPosition.top +  27;

  
  if(y > max){
    y = max;
  }


  tooltip.attr('visibility', 'visible');
  tooltipBox.attr('transform',`translate(${0}, ${0})`);  
  tooltip.attr('transform',`translate(${0}, ${0})`);

  // If the tooltip text contains break-line
  if(match){

    var stringBroken = mouseovertext.split('\n').reverse();    

    tooltip.attr('x', x);
    tooltip.attr('y', y);
    tooltip.text(mouseovertext);
    
    for(var i=0; i<stringBroken.length; i++){

      tooltip.text(stringBroken[i]);      
      tooltip.attr('y', y - (i * 12));
      if(maxTextBoxWidth < tooltip.node().getBBox().width){
        maxTextBoxWidth = tooltip.node().getBBox().width;
      }
      if(i===(stringBroken.length-1)){
        break;
      }      
      var clonedNode = tooltip.node().cloneNode(true);
      clonedNode.setAttribute("class", "tempTextElement");
      expressionBiasBlock ? $("#expression-bias").get(0).appendChild(clonedNode) : $("#bar_expression_viewer_chart_svg").get(0).appendChild(clonedNode);

    }
    
    textBox = tooltip.node().getBBox();
    textBoxHeight = textBox.height;
    textBoxHeight = stringBroken.length * textBoxHeight;        

  } else {        

    tooltip.attr('x', x);
    tooltip.attr('y', y);
    tooltip.text(mouseovertext);    
    textBox = tooltip.node().getBBox();
    textBoxHeight = textBox.height;
    maxTextBoxWidth = textBox.width;

  }

 
  var xOffset = textBox.width + widthPerBar;
  var padding = 2;
  var rigthBox = textBox.x + textBox.width;

  if(this.opt.plot == "Ternary"){
      xOffset = 0;
  } else {
    tooltip.attr('x', x - xOffset);
    $('.tempTextElement').attr('x', x - xOffset);
  }
  
  tooltipBox.attr('x', textBox.x - xOffset - padding);
  tooltipBox.attr('y', textBox.y - padding);
  tooltipBox.attr('width', maxTextBoxWidth + (padding*2));  
  tooltipBox.attr('height', textBoxHeight + (padding*2));  
  tooltipBox.attr('visibility', 'visible');
}

ExpressionBar.prototype.hideTooltip = function() {
  this.tooltip.attr('visibility', 'hidden');
  this.tooltipBox.attr('visibility', 'hidden');
  d3.selectAll('.tempTextElement').remove();
  return;
}

ExpressionBar.prototype.saveTextFile = function(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

ExpressionBar.prototype.render = function() {

  this._selectPlotType();

  var chart = this.chart;
  var gene = this.opt.highlight;

  var data = this.data.getGroupedData(this.opt.renderProperty, this.opt.groupBy);
  var sc = this.opt.sc;
  var barHeight = this.opt.barHeight;
  var titleGroupSpace = this.opt.titleGroupSpace;
  var groupBy = this.opt.renderGroup;
  this.totalGenes = Object.keys(this.data.values).length;
  this.totalRenderedGenes = data.length;

  var barWidth = this.renderObject.calculateBarWidth();
  this.data.renderedData = data;

  this.x = d3.scaleLinear().range([0, barWidth]);
  this.x.domain([0,this.maxInData()])

  var x=this.x;
  if(data[0]){
    this.totalHeight = barHeight * (data[0].length + 2 );
  } else {
    this.totalHeight = 100;
  }

  chart.attr('height', this.totalHeight );

  this.chartFoot.selectAll("*").remove();
  this.chartHead.selectAll("*").remove();

  this.renderSelection();

  this.renderTitles();
  this.renderFactorTitles();

  this.barGroup = chart.append('g');
  this.svgFootContainer = d3.select("#"+this.chartSVGidFoot);
  this.renderObject.renderGlobalScale();

  for (var i in data) {
    this.renderObject.renderGeneBar(i);
    if(!this.opt.showTernaryPlot){    // If this is a ternary plot don't render the gene titles
      this.renderGeneTitles(i);
    }
    this.renderObject.renderScales(i);
  }

  // This is to make the factor and gene title to be dynamic, not best practice for now :(
  this.chartHead.attr('height', this.opt.headerOffset);
  this.factorTitle.attr('transform', `translate(0, ${this.opt.headerOffset})`);
  selectionboxHighlight.attr('height', this.opt.headerOffset);

  this.renderTooltip();

  // When the render is finished hide the progressbar
  $(`#${this.opt.target}-progressbar`).hide();  

};


ExpressionBar.prototype.dataLoaded = function(){
  if(this.opt.restoreDisplayOptions){
    this.restoreDisplayOptions();
  }
  this.setAvailableFactors();
  this.prepareColorsForFactors();
  this.refreshSVG();
  this.renderPropertySelector();

  this.renderSortWindow();
  this.checkSelectedFactors();  

  if(typeof this.data.compare === "undefined" || this.data.compare.length == 0){
    jQuery( '#' + this.opt.target + '_homSpan' ).show();
    jQuery( '#' + this.opt.target + '_ternSpan' ).show();
  }else{
    jQuery( '#' + this.opt.target + '_homSpan' ).hide();
    jQuery( '#' + this.opt.target + '_ternSpan' ).hide();
  }

  if(this.opt.plot == 'HeatMap'){
    jQuery( '#' + this.opt.target + '_homSpan' ).hide();
    jQuery( '#' + this.opt.target + '_ternSpan' ).hide();
  }

  if(typeof this.opt.sortOrder !== 'undefined'){
    this.data.sortRenderedGroups();
    //TODO: add an option to remove the annimation on the initial load
    this.refresh();
  }
};

ExpressionBar.prototype.renderChartScale = function(){
  var self = this;
  var scaleContent = `
  <div id="font_size_slidebar" class="size_scales"><h3>Zoom</h3></div>
  `;
  var chartScales = $(`#${this.chartScale}`);
  chartScales.append(scaleContent).css('padding-top', 20).css('display', 'inline-block').css('vertical-align', 'middle');
  chartScales.find('.size_scales').width(window.innerWidth * 0.2).css('text-align', 'center').css('display', 'inline-block').css('margin-left', 30);;


  chartScales.find('#font_size_slidebar').slider({
    min: 13,
    max: 19,
    value: this.opt.fontSize,
    change: function(event) {
      self.opt.headerOffset = 0;
      var value = $(this).slider("value");
      self.opt.fontSize = value;
      self.opt.barHeight = value;


      self.setupSVG();
      self.refreshSVG();
	    
    }
  });
}

ExpressionBar.prototype.adjustHeight = function(newHeight){  

  // Set minimum height 
  if(newHeight < 580){
    newHeight = $(window).height();
  }

  this._container.height(newHeight);

  var headDivHeight = $(`#${this.chartSVGidHeadDiv}`).height();
  var optionsHeight = $(`#${this.opt.target}_options`).height();  //sortDivId
  var sortIconHeight = $(`#${this.sortDivId}`).outerHeight();
  var chartHeight = newHeight - sortIconHeight - headDivHeight - optionsHeight - 90; // 40 is the scale height & the rest is uncalculated margin (some components render later)    

  $(`#${this.plotContainer}`).height(chartHeight);  

}

ExpressionBar.prototype.adjustWidth = function(newWidth){

  // If the window width is less than 900 set the width to 1000
  var parentElem = $(`#${this.opt.target}`).parent();
  var parentWidth = parentElem.outerWidth() - 55; // 55 is the scrollbar width also needs to include scrollbar of expvip
  if(parentWidth < 900){
    this.opt.width = 1500;
  } else {
    this.opt.width = parentWidth;
  }

}

// This function needs to be reference in the project that it is embeded in
ExpressionBar.prototype.resizeChart =  function(newHeight){  

  // Resetting the headeroffset
  this.opt.headerOffset = 0;
  this.adjustWidth();
  this.adjustHeight(newHeight);
  this.setupSVG();
  this.refreshSVG();
}

ExpressionBar.prototype._hasTernKey = function(values, tern){

  // If there is no homoeologues
  if(Object.keys(values).length == 1){

    $(`#${this.opt.target}_homSpan`).hide('fast');
    $(`#${this.opt.target}_ternSpan`).html("");
    this._storeValue('showTernaryPlot',false);
    this._storeValue('showHomoeologues',false);

  } else {  // If there is homoeologues

    $(`#${this.opt.target}_homSpan`).css('display', 'initial');
    $(`#${this.opt.target}_ternSpan`).css('display', 'initial');

    if(Object.keys(tern).length === 3){
      $(`#${this.opt.target}_ternSpan`).css('display', 'initial');
    } else {
      $(`#${this.opt.target}_ternSpan`).html("No homologies for ternary plot").css('display', 'initial').css('color', 'red');
      this._storeValue('showTernaryPlot',false);
    }
  }

}

var heatmap = require( "./heatmap.js" );

require('biojs-events').mixin(ExpressionBar.prototype);
module.exports.ExpressionBar = ExpressionBar;
