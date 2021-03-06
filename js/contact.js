//wrap everything in a self-executing anonymous function to move to local scope
(function(){

var map,projection;

var airportsURL = 'http://localhost:8081/airports'
var routesURL = 'http://localhost:8081/routes'


//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){

    //map frame dimensions
    var width = $("#mapDiv").innerWidth(),
        height =$("#mapDiv").innerHeight();

    //create new svg container for the map
    map = d3.select("#mapDiv")
	
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);
    
    //create Albers equal area conic projection
    projection = d3.geoAlbers()
        .center([-0.8, 39.96])
        .rotate([93.73, 0.91, 0])
        .parallels([35.68, 45.50])
        .scale(1750)
        .translate([width/2, height/2]);

    //Azimuthal
    // var projection = d3.geo.azimuthal()
    // .mode("equidistant")
    // .origin([-98, 38])
    // .scale(1400)
    // .translate([640, 360]);

    path = d3.geoPath()
        .projection(projection);

    //use d3.queue to parallelize asynchronous data loading
    d3.queue()
        .defer(d3.json, "data/states.topojson") //load background states
        .await(callback);
	
    function callback(error,states){
        //Translate the topojson
        var states_topo = topojson.feature(states, states.objects.collection);

        //Generate map
        setStateOverlay(states_topo, map, path);
        //getFirstAirportDelays(map);

 
    };
};

//add states to map
function setStateOverlay(states_topo, map, path){
    var states = map.append("path")
        .datum(states_topo)
        .attr("class", "states")
        .attr("d", path);
};

var changeTimer = false;
$("input[name=proportional_symbol],#yearInput,#monthInput,#dayInput,input[name=delay],input[name=airline],input[name=checkBtn]" ).on("change",function(){
    if(changeTimer !== false) clearTimeout(changeTimer);
    changeTimer = setTimeout(function(){
        var type = $('input[name=proportional_symbol]:checked').val()
        var fyr = $('#yearInput').val().split(",")[0]
        var lyr = $('#yearInput').val().split(",")[1]
        var fmth = $('#monthInput').val().split(",")[0]
        var lmth = $('#monthInput').val().split(",")[1]
        var fdow = $('#dayInput').val().split(",")[0]
        var ldow = $('#dayInput').val().split(",")[1]
        var delay = $('input[name=delay]:checked').val()
        var airline = $("input[name=airline]:checked").map(function() {
			return parseInt(this.value);
		}).get();

	//Do ajax call	
	$.ajax({
        url: airportsURL,
        data: {
            type: type,
            fyr: fyr,
            lyr: lyr,
            fmth: fmth,
            lmth: lmth,
            fdow: fdow,
            ldow: ldow,
            airlines: eval(airline).join(",")
        },
        error: function() {
            console.log("error");
        },
        dataType: 'json',
        success: function(data) {
            updateAirportDelays(data.data,map,delay);
        },
        type: 'GET'
    });

            changeTimer = false;
        },150);
});

function updateAirportDelays(airports,map,delayType){
	for (i = 0; i < airports.length; i++) {
            var location = [+airports[i].lng, +airports[i].lat]
            var position = projection(location)
            airports[i]["position"] = position
        }

    map.selectAll("svg#circles").remove();
    var circles = map.append("svg")
    	.attr("id", "circles");

	circles.selectAll("circles")
        .data(airports)
        .enter()
        .append("circle")
	        .attr('cx', function(d) {return d.position[0]})
	        .attr('cy', function(d) { return d.position[1]})
	        .attr("r", function(d) { return d.stats.delayed/3;})
	        .style("fill",function() {
    return "hsl(" + Math.random() * 360 + ",100%,50%)";
    });
}



function highlightAirport(props){
    //change stroke
    var selected = d3.selectAll("#" + props.iata)
        .style("stroke", "yellow")
        .style("stroke-width", "5")
        .style("stroke-opacity", "1");

    //call set label
    //setLabel(props);

};

function dehighlightAirport(props){
    var selected = d3.selectAll("#" + props.iata)
        .style("stroke", function(){
            return getStyle(this, "stroke")
        })
        .style("stroke-width", function(){
            return getStyle(this, "stroke-width")
        });

    // d3.select(".infolabel")
    //     .remove();

    function getStyle(element, styleName){
        var styleText = d3.select(element)
            .select("desc")
            .text();

        var styleObject = JSON.parse(styleText);

        return styleObject[styleName];
    };
};
	
	
	//range sliders
	$(".range-slider1").jRange({
		from:2014,
		to:2016,
		step:1,
		scale:[2014,2015,2016],
		width:230,
		showLabels:false,
		isRange:true,
		snap:true
	})
	
	$(".range-slider2").jRange({
		from:1,
		to:12,
		step:1,
		scale:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
		width:230,
		showLabels:false,
		isRange:true,
		snap:true
	})
	
	$(".range-slider3").jRange({
		from:1,
		to:7,
		step:1,
		scale:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
		width:230,
		showLabels:false,
		isRange:true,
		snap:true
	})
	
	//airline checkboxes
	$(document).ready(function() {
		var checkBoxes = $("input[name=airline]");
		checkBoxes.prop("checked", true);
	$(".check").click(function() {
		var checkBoxes = $("input[name=airline]");
		checkBoxes.prop("checked", !checkBoxes.prop("checked"));
		if (checkBoxes.prop("checked")){
			$(this).val("Uncheck All")}
		else{
			$(this).val("Check All")}
		});   
	});
	
	//create grayout background
	d3.select(".container2")
		.append("div")
		.attr("class","grayOut")
	//create intro window and fade out effect	
	d3.select("body")
		.append("div").attr("class","OverviewBox")
		.html("<span class='OverviewBoxTitle'><p>Welcome to U.S. Delay Flight Tracker</p></span><span class='OverviewBoxContent'><p>This interactive map is for exploring the temporal and spatial trends of delay domestic flights within the U.S. from 2014 to 2016. We believe that users will make better and smarter itinerary decisions by comparing the historic differences in delay frequencies between airlines.<br> To detect more insights, you can use the filters on the left-hand side to investigate information such as the percentage of delay flights per airport, average delay time per airport, delay patterns across time and airlines, types of flight delay, etc.<br> If you want to get a more intuitive guide on how to use this map, please watch this <a href='tutorial.html' target='_blank'>tutorial</a>.</p></span>")
		.append("button").attr("class","OverviewButton")
		.text("Click Here to Back To the Contact Page")
		.on("click",function(){
			$(".OverviewBox").fadeOut(350)
			$(".grayOut").fadeOut(350)
	})
	
	//hide intro box and grayout background when the page is loaded
	$(".OverviewBox").hide()
	$(".grayOut").hide()
	
	//display intro window again 
	$(".menu-button1").on("click",function(){
		$(".OverviewBox").fadeIn(350)
		$(".grayOut").fadeIn(350)
	})
	
	//set up hover effect for resetter buttons
	$(".resetter").hover(function(){
		$(this).toggleClass('hovered')
		})
	
	//reset for proportional symbol filter
	$(".return_default1").on("click",function(){
		var radioButton1=$("input[id=percentage]");
		radioButton1.prop("checked",true);
	})
	
	//reset for time filter
	$(".return_default2").on("click",function(){
		var slider1=$("input[id=yearInput]");
		var slider2=$("input[id=monthInput]");
		var slider3=$("input[id=dayInput]");
		slider1.jRange("setValue", "2014,2015"); 
		slider2.jRange("setValue","0,6"); 
		slider3.jRange("setValue","1,4"); 
	})
	
	//reset for delay filter
	$(".return_default3").on("click",function(){
		var showAllButton=$("input[id=all]");
		showAllButton.prop("checked",true);
	})
	
	//reset for airline filter
	$(".return_default4").on("click",function(){
		var checkBoxes = $("input[name=airline]");
		checkBoxes.prop("checked",true);
	})

	//fuzzy search
	// var options = {
	// 	shouldSort: true,
	// 	includeMatches: true,
	// 	threshold: 0.5,
	// 	location: 0,
	// 	distance: 100,
	// 	maxPatternLength: 24,
	// 	minMatchCharLength: 3,
	// 	keys:[
	// 	"name",
	// 	"city",
	// 	"iata"
	// 	]
	// };
	// var fuse = new Fuse(airports, options); // "list" is the item array
	// var result = fuse.search("");
	
})();