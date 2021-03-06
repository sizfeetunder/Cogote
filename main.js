var playlist_list=null;
var dummy_tile=document.getElementById("music_entry_0");
var mock_tile=dummy_tile.cloneNode(true);
var music_list=document.getElementById("music_list");
music_list.removeChild(dummy_tile);


function add_song_tiles(song,artist,i,event_response,delete_event){
    var curr_tile=mock_tile.cloneNode(true);

    curr_tile.id="music_entry_"+String(i);
    
    var artist_node=curr_tile.childNodes[1];
    var song_node=curr_tile.childNodes[3];
    var del_node=curr_tile.childNodes[5];
    var add_node=curr_tile.childNodes[7];

    artist_node.id="artista_"+String(i);
    artist_node.innerHTML=song;
    song_node.id="cancion_"+String(i);
    song_node.innerHTML=artist;
    del_node.id="del_"+String(i);
    del_node.addEventListener("click",delete_event);
    add_node.id="add_"+String(i);

    //Update grid location
    curr_tile.style.gridRow=i;
    //Add new listeners
    artist_node.addEventListener("click",event_response);
    song_node.addEventListener("click",event_response);
    //curr_tile.addEventListener("click",event_response);
    music_list.appendChild(curr_tile);
}
function delete_song(index){
    var curr_entry=document.getElementById("music_entry_"+String(index));
    music_list.removeChild(curr_entry);
}
function load_from_local(event_response,delete_event){
    //Populate list of songs into playlist form localstorage
    playlist_list=localStorage.getItem("playlists");
    if (playlist_list!=null){
        playlist_list=JSON.parse(playlist_list);
        //Song is a stack of songs based on added time
        song_list=playlist_list["All songs"];
        counter=0;
        for (var entry=0;entry<song_list.length;entry++){
            
            if (song_list[entry]==null || song_list[entry].length==null){
                continue;
            }
            counter+=1;
            var song=song_list[entry][0];
            var artist=song_list[entry][1];
            var url=song_list[entry][2];
            add_song_tiles(song,artist,counter,event_response,delete_event);


        document.documentElement.style.setProperty("--num_songs",song_list.length);
        }
    }
    else{
        //Create a new entry.
        var all_songs={length:0};
        var dict_of_playlists={};
        dict_of_playlists["All songs"]=all_songs
        playlist_list=dict_of_playlists;
        localStorage.setItem("playlists",JSON.stringify(dict_of_playlists));
    }
}
Util.events(document, {
	// Final initalization entry point: the Javascript code inside this block
	// runs at the end of start-up when the DOM is ready
	"DOMContentLoaded": function() {
        var current_song=null;
        var play_button=document.getElementById("play");
        var pause_button=document.getElementById("pause");

        var raw_media_links=[];
        var backup_url="";
        var curr_index=0;
        var is_shuffled=false;

        var guessed_links=[null,null];

        async function get_raw_data(query){
            var medias=[]
            var query=await process_search(query);
            for (var index=0;index<4;index++){
                var name=query[1][index];
                medias.push(name);
            }
            return [query,medias];
        }
        async function build_media_link(query,i){
            var url1=query[0][i];
            var name=query[1][i];
            //[decoded_url,raw_signature,raw_player]
            var data= await collect_raw(url1);
            console.log ("THIS IS QUERIED MEDIA URL");
            console.log(data);
            //Check if you need to unscramble
            if (data[3]!=""){
                var unscrambled_sig=data[3];
            }
            else{
                var unscrambled_sig=await unscramble(data[1],data[2]);
            }
            var media_url=data[0]+"&signature="+unscrambled_sig;
            
            
            return [media_url,name]; 
        }
        async function play(source,check){
            if (current_song==null){
                current_song=document.createElement("audio");
                current_song.src=source;
            }
            if (check){
                current_song.src=source;
            }
            //Add an event to wait for the song is done then fetch next one
            current_song.addEventListener("ended",proxima);
            pause_button.style.display="inline";
            play_button.style.display="none";
            
            document.getElementById("result_container").style.display="none";
            return current_song.play();
        }
        function pause(){
            document.getElementById("result_container").style.display="none";
            current_song.pause();
            play_button.style.display="inline";
            pause_button.style.display="none";
        }

        function set_up_search(){
            var search_elt=document.getElementById("search_query");
            //Clear and get ready for new search
            search_elt.value="";
            document.getElementById("result_container").style.display="none";

            
        }
        async function request_search(e){
            if (e.which==13){
                var query=document.getElementById("search_query").value;

                var raw_data=await get_raw_data(query);
                var url_names=raw_data[1];
                for (var index=0;index<4;index++){
                    var name=url_names[index];
                    var arr=name.split("-");
                    if (arr.length>1){
                        document.getElementById("song_"+String(index+1)).innerHTML=arr[1];
                        document.getElementById("artist_"+String(index+1)).innerHTML=arr[0]
                    }
                    else{
                        document.getElementById("song_"+String(index+1)).innerHTML=arr[0];
                        document.getElementById("artist_"+String(index+1)).innerHTML="Artist not Found";
                    }
                }
                raw_media_links=raw_data[0];
                guess_media();
                document.getElementById("result_container").style.display="grid";
                //Hack hide the keyboard by changing focus away from input
                document.getElementById("search_query").blur();
            }
        }
        async function guess_media(){
            //build media link for the first 2 results.
            build_media_link(raw_media_links,0).then(function(value){
                guessed_links[0]=value;
            });
            build_media_link(raw_media_links,1).then(function(value){
                guessed_links[1]=value;
            });
        }
        async function pull_media(e){
            var song_id=e.target.id.split("_")[1];
            var song_id=song_id[song_id.length-1];

            document.getElementById("result_container").style.display="none";
            document.getElementById("curr_song").innerHTML="Loading Song...";
            document.getElementById("curr_artist").innerHTML="";
            //Check if a guess finished and matches with request
            something=false;
            if (song_id==1 && guessed_links[0]!=null){
                console.log("cache 1");
                var post_media_link=guessed_links[0];
                something=true;
            }
            if (song_id==2 && guessed_links[1]!=null){
                console.log("cache_2");
                var post_media_link=guessed_links[1];   
                something=true;              
            }
            if (!something){
                var post_media_link=await build_media_link(raw_media_links,song_id-1);
            }
            play(post_media_link[0],true);
            guessed_links=[null,null];
            
            //Update now playing containers
            document.getElementById("curr_song").innerHTML=document.getElementById("song_"+String(song_id)).innerHTML;
            document.getElementById("curr_artist").innerHTML=document.getElementById("artist_"+String(song_id)).innerHTML;
            backup_url=raw_media_links[0][song_id-1];
            
        }
        async function refresh_tile_data(tile_data){
            var link=tile_data[3];
            var new_query=[[link],[""]]
            var post_media_link=await build_media_link(new_query,0);
            
            return [tile_data[0],tile_data[1],post_media_link[0],link];
        }
        function play_tile(e){
            var song_id=e.target.id.split("_")[1];
            curr_index=song_id;
            var curr_playlist=document.getElementById("playlist_select").value;
            var list_of_songs=playlist_list[curr_playlist];

            var song_pack=list_of_songs[song_id-1];
            var song_name=song_pack[0];
            var artist_name=song_pack[1];
            var song_url=song_pack[2];

            document.getElementById("result_container").style.display="none";
            //Update now playing containers
            document.getElementById("curr_song").innerHTML=document.getElementById("cancion_"+String(song_id)).innerHTML;
            document.getElementById("curr_artist").innerHTML=document.getElementById("artista_"+String(song_id)).innerHTML;

           
            play(song_url,true).then(function(){
            }).catch(async function(error){
                //Request new media link && update localstorage about the new link
                refreshed_data=await refresh_tile_data(song_pack);
                play(refreshed_data[2],true);
                list_of_songs[song_id-1]=refreshed_data;
                playlist_list[curr_playlist]=list_of_songs;
                localStorage.setItem("playlists",JSON.stringify(playlist_list));
            });  
        }
        function add_to_playlist(){
            //Check current selected playlist in selector and add current song into entry.
            var curr_playlist=document.getElementById("playlist_select").value;
            var list_of_songs=playlist_list[curr_playlist];
            
            var song_playing=document.getElementById("curr_song").innerHTML;
            var artist_playing=document.getElementById("curr_artist").innerHTML;
            var url_playing=current_song.src;

            //Add to local to storage
            var to_storage=[song_playing,artist_playing,url_playing,backup_url];
            document.getElementById("result_container").style.display="none";
            
            console.log(list_of_songs.length);
            list_of_songs[list_of_songs.length]=to_storage;
            list_of_songs.length+=1;
            playlist_list[curr_playlist]=list_of_songs;
            localStorage.setItem("playlists",JSON.stringify(playlist_list));

            document.documentElement.style.setProperty("--num_songs",list_of_songs.length);
            add_song_tiles(song_playing,artist_playing,list_of_songs.length,play_tile,delete_song_tile);
        }
        //delta in {1,-1}
        //curr starts with indexing of 0;
        function next_song(curr,delta){
            var curr_playlist=document.getElementById("playlist_select").value;
            var list_of_songs=playlist_list[curr_playlist];
            var song_id=((curr+delta)%list_of_songs.length+list_of_songs.length)%list_of_songs.length;

            console.log(song_id);
            var song_pack=list_of_songs[song_id];
            var song_name=song_pack[0];
            var artist_name=song_pack[1];
            var song_url=song_pack[2];

            //Update now playing containers
            document.getElementById("curr_song").innerHTML=document.getElementById("cancion_"+String(song_id+1)).innerHTML;
            document.getElementById("curr_artist").innerHTML=document.getElementById("artista_"+String(song_id+1)).innerHTML;

            
            play(song_url,true).then(function(){
            }).catch(async function(error){
                //Request new media link && update localstorage about the new link
                refreshed_data=await refresh_tile_data(song_pack);
                play(refreshed_data[2],true);
                list_of_songs[song_id]=refreshed_data;
                playlist_list[curr_playlist]=list_of_songs;
                localStorage.setItem("playlists",JSON.stringify(playlist_list));
            });
        }
        function proxima(){
            var curr_playlist=document.getElementById("playlist_select").value;
            var list_of_songs=playlist_list[curr_playlist];
            if (is_shuffled){
                var shuffled_index=Math.floor(Math.random()*list_of_songs.length);
                curr_index=shuffled_index;
                next_song(curr_index,0);
            }
            else{
                next_song(curr_index-1,1);
                curr_index=(curr_index+1)%list_of_songs.length;
            }
        }
        function anterior(){
            var curr_playlist=document.getElementById("playlist_select").value;
            var list_of_songs=playlist_list[curr_playlist];
            if (is_shuffled){
                var shuffled_index=Math.floor(Math.random()*list_of_songs.length);
                curr_index=shuffled_index;
                next_song(curr_index,0);
            }
            else{
                next_song(curr_index-1,-1);
                curr_index=(curr_index-1)%list_of_songs.length;
            }
        }
        function shuffle(){
            //Update the shuffled image
            var shuffle_img=document.getElementById("shuffle_img")
            if (shuffle_img.style.filter=="invert()"){
                shuffle_img.style.filter="";
                is_shuffled=false;
            }
            else{
                shuffle_img.style.filter="invert()";
                is_shuffled=true;
            }
        }
        function delete_song_tile(e){
            console.log("deleting")
            if (e.path!=null){
                //We're in a chrome device
                var pot_1=e.path[0].id;
                if (pot_1.split("_").length>1){
                    var song_id=pot_1.split("_")[1]
                }else{
                    var song_id=e.path[1].id.split("_")[1];
                }
            }
            else{
                //We're in a firefox device
                var song_id=e.originalTarget.id.split("_")[1];        
            }
            var curr_playlist=document.getElementById("playlist_select").value;
            var list_of_songs=playlist_list[curr_playlist];
            delete list_of_songs[song_id-1];
            list_of_songs.length-=1;
            playlist_list[curr_playlist]=list_of_songs;
            localStorage.setItem("playlists",JSON.stringify(playlist_list));
            delete_song(song_id);

        }

        load_from_local(play_tile,delete_song_tile);

        Util.one("[id='play']").addEventListener("click",play);
        Util.one("[id='pause']").addEventListener("click",pause);

        Util.one("[id='search_bar']").addEventListener("click",set_up_search);
        Util.one("[id='search_query']").addEventListener("keydown",request_search);
        Util.one("[id='result_container']").addEventListener("click",pull_media);

        //Adding new songs to a playlist 
        Util.one("[id='add']").addEventListener("click",add_to_playlist);
        try{
            Util.one(".artist_name").addEventListener("click",play_tile);
            Util.one(".song_name").addEventListener("click",play_tile);
            Util.one(".del_button").addEventListener("click",delete_song_tile);
        }
        catch (err){
            console.log("Playlists are most likely empty");
        }
        //Next and previous
        Util.one("[id='next']").addEventListener("click",proxima);
        Util.one("[id='previous']").addEventListener("click",anterior);
        Util.one("[id='shuffle']").addEventListener("click",shuffle);
	},

	// Keyboard events arrive here
	"keydown": function(evt) {
    },
    // Click events arrive here
	"click": function(evt) {
        
    },
	"click": function(evt) {

    },
	"mousemove": function(evt) {

    },
	"mouseup": function(evt) {

    }
});
 

