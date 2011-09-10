###
This appraoch allows colors to be stored as constants
###

blue = "#5E87B0"
yellow = "#F7C942"
first_click_color = yellow
second_click_color = blue
red = "red"

$("head").append "
  <style>

    .toggle-grid-with-timer .ui-checkbox span.show{
      color: black;
    }

    .toggle-grid-with-timer .ui-checkbox-on span {
      text-decoration: line-through;
    }

    .toggle-grid-with-timer .ui-checkbox span{
      color: #F6F6F6;
    }
    .toggle-grid-with-timer .ui-btn-active{
      background-image: none;
      color:blue;
    }

    .toggle-grid-with-timer .ui-checkbox .last-attempted{
      outline: 5px solid #{yellow};
      outline-offset: -10px;
    }

    .toggle-grid-with-timer .ui-btn-icon-notext{
      margin-left: 20px;
      vertical-align: middle;
    }

    span.timer-seconds{
      float:right;
      margin-right:10px;
      margin-top:5px;
      font-size: large;
    }

    .controls.flash{
      color: black;
      background-color: #{red};
    }

    .flash {
      color: #{red};
    }

    #InitialSound .ui-controlgroup-label{
      font-size: x-large;
    }

    #Phonemes legend{
      font-size: x-large;
    }


    .grid{
      text-align: center;
      float: left;
      width: 50px;
      margin: 10px;
      font-size: 300%;
      border: 3px outset gray;
      background-color: lightgray;
      color: lightgray;
      -webkit-user-select: none;
      -khtml-user-select: none;
      -moz-user-select: none;
      -o-user-select: none;
      user-select: none;
    }

    .grid.show{
      color: black;
    }

    .grid.selected{
      text-decoration: line-through;
      color: white;
      background-color: #{blue};
    }
    .grid.last-attempted{
      border-right-color: red;
      border-top-color: red;
      border-bottom-color: red;
      border-width: 5px;
      border-style: solid;
    }

    @media screen and (orientation:portrait){ 
      .grid-width{
        width: 440px;
      }
    }
    @media screen and (orientation:landscape) {
      .grid-width{
        width: 810px;
      }
      .toggle-row-portrait{
        display: none;
      }
    }

    .toggle-row{
      background-color: #{blue};
      width: 30px;
      height: 30px;
    }
    

  </style>
  "
