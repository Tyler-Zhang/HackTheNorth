var colors = ["255, 99, 132", "75, 198, 172", "173, 120, 195", "237, 208, 64", "223, 130, 18"];
function makeCharts(data)
{
	setInner("status", "Calculating charts");

	var ctx = document.getElementById("acumDayChart").getContext("2d");
	var ctx2 = document.getElementById("totalDayChart").getContext("2d");
	
	var hourLabels = ["12:00 am"];
	var nameLabels = [];
	var max = 0;

	var accumDataset = [], totalDayDataset = [];
	var obj = data.body;
	
	for(var x = 1; x <= 23; x ++)
		hourLabels.push(((x > 12)? x%12 : x) +":00 " + ((x> 12)? "pm": "am"));
	hourLabels.push("12:00 pm");
	
	var date = new Date();
	

	for(var x = 0; x < obj.userAmt; x++)
	{
		var usrObj = obj.users[x][date.getMonth()];
		if(usrObj == undefined || usrObj[date.getDate()] == undefined)
		{
			 usrObj = [];
			 usrObj[date.getDate()] = [];
		}
		usrObj = usrObj[date.getDate()];
		var data = [];
		var total = 0;
		for(var y = 0; y < date.getHours() + 1; y ++)
		{
			total += ((usrObj[y] == null)? 0 : usrObj[y]);
			data.push(total);
		}
		max = Math.max(max, total);
		accumDataset.push(datasetObj(obj.users[x].name, [0].concat(data, "line"), colors[x]));
		nameLabels.push(obj.users[x].name);
		totalDayDataset.push(datasetObj(obj.users[x].name, genArray(x, obj.userAmt, total), colors[x], "bar"));
	}

	// Draw date accumulated chart
	
	function datasetObj(name, data, color, type)
	{
		var x = {};
		x.label = name;
		x.data = data;
		x.backgroundColor = 'rgba(' + color + ',0.2)';
		x.borderColor = 'rgba(' + color + ',1)';
		x.borderWidth = 1;
		if(type == "line")
		{
			x.lineTension = 0.3;
		}
		return x;
	}

	var mChart = new Chart(ctx, {
		type: 'line',
		data: {
			labels: hourLabels,
			datasets: accumDataset		
		},
		options: {
			title: {
				display: true,
				fontSize: 25,
				padding: 20,
				text: "Acumulated Cellphone Usage for the Day by Minutes"
			},
			legend: {
				position: "bottom",
				labels: {
					boxWidth:12,
					fontSize:13,
					padding: 30
				}
			},
			scales: {
				yAxes: [{
					ticks: {
						min: 0,
						max: Math.max(max, 100)
					}
				}]
			}
		}
	});
	// This is such a hack, but Chart.js is broken. It keeps resizing the canvas.
	ctx2.canvas.height = ctx.canvas.height/1.3;
	var tChart = new Chart(ctx2, {
		type: 'bar',
		data: {
			labels: nameLabels,
			datasets: totalDayDataset		
		},
		options: {
			title: {
				display: true,
				fontSize: 25,
				padding: 20,
				text: "Total Usage by Day"
			},
			legend: {
				display:false
			},
			scales: {
				xAxes: [{
						stacked: true,
				}],
				yAxes: [{
						stacked: true,
						ticks: {
							min: 0,
							max: Math.max(max, 100)
						}
				}]
			}
		}
	});
}