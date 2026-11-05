// Kurser i utbildningen IT-projektledare. Lägg till en ny kurs genom att lägga till en rad här.
window.COURSES=[
{id:"pl55",name:"Projektledning – modeller, verktyg och processer",yhp:55,topics:[]},
{id:"it10",name:"IT-orientering",yhp:10,topics:[]},
{id:"itpl30",name:"IT-projektledning",yhp:30,topics:[]}
];
// Används av datafilerna: addTopics("kurs-id", [ämnen])
window.addTopics=function(id,arr){const c=COURSES.find(x=>x.id===id);if(!c){console.error("Okänd kurs: "+id);return;}c.topics.push(...arr);};
